package expo.modules.coucoucapture

import android.app.StatusBarManager
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.core.content.FileProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class CoucouCaptureModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context unavailable" }

  override fun definition() = ModuleDefinition {
    Name("CoucouCapture")

    /** Server address + capture key used by the quick-settings tile / selection menu. */
    Function("configure") { apiUrl: String, token: String? ->
      CaptureStore.configure(context, apiUrl, token)
    }

    Function("getStatus") {
      mapOf("configured" to CaptureStore.isConfigured(context), "queued" to CaptureStore.queueSize(context))
    }

    /** Android 13+: asks the system to add the quick-settings tile (one tap). */
    AsyncFunction("requestAddTile") { promise: Promise ->
      if (Build.VERSION.SDK_INT >= 33) requestTile(promise) else promise.resolve("unsupported")
    }

    /**
     * Sends the invoice picture (a file from react-native-view-shot) to the
     * customer through the app the order came from:
     *  - "whatsapp": straight into the customer's chat (picture + caption);
     *  - "instagram" / "facebook" / "tiktok": that app's own share screen,
     *    to pick the conversation;
     *  - anything else, or the app missing: the system share menu.
     * Returns what was opened: "chat", "app" or "menu".
     */
    Function("shareInvoice") { path: String, target: String, phone: String, caption: String ->
      val src = File(path.removePrefix("file://"))
      val dir = File(context.cacheDir, "invoices").apply { mkdirs() }
      val file = File(dir, "invoice.png")
      src.copyTo(file, overwrite = true)
      val uri = FileProvider.getUriForFile(context, "${context.packageName}.coucou.files", file)

      fun send(pkg: String?, component: String? = null) = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_TEXT, caption)
        clipData = ClipData.newRawUri("invoice", uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        if (component != null && pkg != null) setClassName(pkg, component) else if (pkg != null) setPackage(pkg)
      }
      val starter = appContext.currentActivity ?: context
      fun tryStart(intent: Intent) = try {
        starter.startActivity(intent)
        true
      } catch (e: ActivityNotFoundException) {
        false
      } catch (e: SecurityException) {
        false
      }

      val candidates: List<Intent> = when (target) {
        "whatsapp" -> listOf("com.whatsapp", "com.whatsapp.w4b").map { pkg ->
          send(pkg).apply { if (phone.isNotEmpty()) putExtra("jid", "$phone@s.whatsapp.net") }
        }
        // Instagram: its "Direct" entry first, then its general share screen.
        "instagram" -> listOf(
          send("com.instagram.android", "com.instagram.direct.share.handler.DirectShareHandlerActivity"),
          send("com.instagram.android"),
          send("com.instagram.lite"),
        )
        "facebook" -> listOf("com.facebook.orca", "com.facebook.mlite", "com.facebook.katana").map { send(it) }
        "tiktok" -> listOf("com.zhiliaoapp.musically", "com.ss.android.ugc.trill", "com.zhiliaoapp.musically.go").map { send(it) }
        else -> emptyList()
      }
      for (intent in candidates) {
        if (tryStart(intent)) return@Function if (target == "whatsapp") "chat" else "app"
      }
      val chooser = Intent.createChooser(send(null), null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      starter.startActivity(chooser)
      "menu"
    }
  }

  @RequiresApi(33)
  private fun requestTile(promise: Promise) {
    val sbm = context.getSystemService(StatusBarManager::class.java)
    sbm.requestAddTileService(
      ComponentName(context, CaptureTileService::class.java),
      "Coucou Toi",
      Icon.createWithResource(context, R.drawable.coucou_capture_tile),
      context.mainExecutor
    ) { result ->
      promise.resolve(
        when (result) {
          StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED -> "added"
          StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED -> "already"
          else -> "dismissed"
        }
      )
    }
  }
}
