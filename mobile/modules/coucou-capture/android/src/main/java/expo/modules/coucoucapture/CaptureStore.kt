package expo.modules.coucoucapture

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Settings + outbox for captured messages. Messages are queued first and
 * sent to the server's /ingest/message one by one; a busy AI or no network
 * leaves them queued for the next attempt, so nothing is lost.
 */
object CaptureStore {
  private const val PREFS = "coucou_capture"
  private const val MAX_QUEUE = 200
  private const val MAX_ATTEMPTS = 8
  private const val SEEN_TTL_MS = 6 * 60 * 60 * 1000L
  private val io = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())

  private fun prefs(ctx: Context) = ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun configure(ctx: Context, enabled: Boolean, apiUrl: String, token: String?) {
    val e = prefs(ctx).edit().putBoolean("enabled", enabled).putString("apiUrl", apiUrl.trimEnd('/'))
    if (token != null) e.putString("token", token)
    e.apply()
  }

  fun isEnabled(ctx: Context) = prefs(ctx).getBoolean("enabled", false)

  fun isConfigured(ctx: Context): Boolean {
    val p = prefs(ctx)
    return !p.getString("token", null).isNullOrEmpty() && !p.getString("apiUrl", null).isNullOrEmpty()
  }

  fun queueSize(ctx: Context): Int = JSONArray(prefs(ctx).getString("queue", "[]")).length()

  /** Queues one notification message unless it was already seen (apps re-post a chat's history). */
  @Synchronized
  fun add(ctx: Context, source: String, sender: String?, text: String) {
    val key = "$source|${sender ?: ""}|$text".hashCode().toString()
    val now = System.currentTimeMillis()
    val p = prefs(ctx)
    val seen = JSONObject(p.getString("seen", "{}"))
    if (seen.has(key)) return
    // Forget old entries so the map stays small.
    val pruned = JSONObject()
    seen.keys().forEach { k -> if (now - seen.optLong(k) < SEEN_TTL_MS) pruned.put(k, seen.optLong(k)) }
    pruned.put(key, now)

    val queue = JSONArray(p.getString("queue", "[]"))
    queue.put(JSONObject().put("source", source).put("sender", sender ?: "").put("text", text).put("mode", "notification").put("attempts", 0))
    while (queue.length() > MAX_QUEUE) queue.remove(0)
    p.edit().putString("seen", pruned.toString()).putString("queue", queue.toString()).apply()
  }

  /** Sends what is queued, oldest first; stops at the first failure to retry later. */
  fun flush(ctx: Context) {
    val app = ctx.applicationContext
    io.execute {
      while (true) {
        val item = synchronized(this) { JSONArray(prefs(app).getString("queue", "[]")).optJSONObject(0) } ?: break
        val status = post(app, item)
        synchronized(this) {
          val queue = JSONArray(prefs(app).getString("queue", "[]"))
          if (queue.length() == 0) return@synchronized
          val retry = status == 0 || status == 503 || status == 429 || status >= 500
          if (retry && item.optInt("attempts") + 1 < MAX_ATTEMPTS) {
            queue.getJSONObject(0).put("attempts", item.optInt("attempts") + 1)
          } else {
            queue.remove(0)
          }
          prefs(app).edit().putString("queue", queue.toString()).apply()
        }
        if (status == 0 || status == 503 || status == 429 || status >= 500) break
      }
    }
  }

  /** Sends copied text right away and reports the outcome in a toast. */
  fun sendNow(ctx: Context, text: String) {
    val app = ctx.applicationContext
    toast(app, "جارٍ تحليل الرسالة…")
    io.execute {
      val item = JSONObject().put("source", "whatsapp").put("sender", "").put("text", text).put("mode", "capture")
      val msg = when (post(app, item)) {
        in 200..299 -> "✓ تمت إضافة الطلب للمراجعة في Coucou Toi"
        422 -> "هذه الرسالة ليست طلباً"
        401 -> "افتح Coucou Toi وفعّل الالتقاط من الإعدادات"
        else -> {
          synchronized(this) {
            val queue = JSONArray(prefs(app).getString("queue", "[]"))
            queue.put(item.put("attempts", 0))
            prefs(app).edit().putString("queue", queue.toString()).apply()
          }
          "تعذّر الاتصال الآن — سيُحلَّل تلقائياً لاحقاً"
        }
      }
      toast(app, msg)
    }
  }

  fun toast(ctx: Context, msg: String) {
    main.post { Toast.makeText(ctx.applicationContext, msg, Toast.LENGTH_LONG).show() }
  }

  /** POSTs one message; returns the HTTP status, or 0 for a network error. */
  private fun post(ctx: Context, item: JSONObject): Int {
    val p = prefs(ctx)
    val apiUrl = p.getString("apiUrl", null) ?: return 401
    val token = p.getString("token", null) ?: return 401
    return try {
      val conn = URL("$apiUrl/ingest/message").openConnection() as HttpURLConnection
      conn.requestMethod = "POST"
      conn.connectTimeout = 15000
      conn.readTimeout = 45000
      conn.doOutput = true
      conn.setRequestProperty("Content-Type", "application/json")
      conn.setRequestProperty("Authorization", "Bearer $token")
      val body = JSONObject()
        .put("source", item.optString("source"))
        .put("text", item.optString("text"))
        .put("mode", item.optString("mode", "notification"))
      if (item.optString("sender").isNotEmpty()) body.put("sender", item.optString("sender"))
      conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
      val code = conn.responseCode
      conn.disconnect()
      code
    } catch (e: Exception) {
      0
    }
  }
}
