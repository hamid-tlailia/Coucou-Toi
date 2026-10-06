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
 * Settings + outbox for copied messages sent from the tile / selection menu.
 * A message that can't be sent (busy AI, no network) is queued and retried
 * on the next send, so nothing is lost.
 */
object CaptureStore {
  private const val PREFS = "coucou_capture"
  private const val MAX_QUEUE = 200
  private const val MAX_ATTEMPTS = 8
  private val io = Executors.newSingleThreadExecutor()
  private val main = Handler(Looper.getMainLooper())

  private fun prefs(ctx: Context) = ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Server address + capture key; token null keeps the stored one, "" signs the phone out. */
  fun configure(ctx: Context, apiUrl: String, token: String?) {
    val e = prefs(ctx).edit().putString("apiUrl", apiUrl.trimEnd('/'))
    if (token != null) e.putString("token", token)
    e.apply()
  }

  fun isConfigured(ctx: Context): Boolean {
    val p = prefs(ctx)
    return !p.getString("token", null).isNullOrEmpty() && !p.getString("apiUrl", null).isNullOrEmpty()
  }

  fun queueSize(ctx: Context): Int = JSONArray(prefs(ctx).getString("queue", "[]")).length()

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
    flush(app) // earlier messages that failed go first (same single thread)
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
