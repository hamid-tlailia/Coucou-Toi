package expo.modules.coucoucapture

import android.app.StatusBarManager
import android.content.ClipData
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.drawable.Icon
import android.os.Build
import android.util.Base64
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
     * Opens the customer's WhatsApp chat with the invoice picture attached and
     * the caption filled in (one direct intent — the picture can't get lost
     * between two screens). Returns false when WhatsApp isn't installed.
     */
    Function("sendImageToWhatsApp") { base64: String, phone: String, caption: String ->
      val pm = context.packageManager
      val pkg = listOf("com.whatsapp", "com.whatsapp.w4b").firstOrNull { installed(pm, it) }
        ?: return@Function false
      val dir = File(context.cacheDir, "invoices").apply { mkdirs() }
      val file = File(dir, "invoice.png")
      file.writeBytes(Base64.decode(base64, Base64.DEFAULT))
      val uri = FileProvider.getUriForFile(context, "${context.packageName}.coucou.files", file)
      val intent = Intent(Intent.ACTION_SEND).apply {
        setPackage(pkg)
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_TEXT, caption)
        if (phone.isNotEmpty()) putExtra("jid", "$phone@s.whatsapp.net")
        clipData = ClipData.newRawUri("invoice", uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      (appContext.currentActivity ?: context).startActivity(intent)
      true
    }
  }

  private fun installed(pm: PackageManager, pkg: String) = try {
    pm.getPackageInfo(pkg, 0)
    true
  } catch (e: PackageManager.NameNotFoundException) {
    false
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
