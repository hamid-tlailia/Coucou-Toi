package expo.modules.coucoucapture

import android.app.StatusBarManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import android.provider.Settings
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CoucouCaptureModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context unavailable" }

  override fun definition() = ModuleDefinition {
    Name("CoucouCapture")

    /** Whether the user granted notification access to the app. */
    Function("hasNotificationAccess") {
      NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
    }

    Function("openNotificationAccessSettings") {
      context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    /** App details screen (Android 13+: "Allow restricted settings" lives in its ⋮ menu). */
    Function("openAppSettings") {
      context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
          .setData(android.net.Uri.fromParts("package", context.packageName, null))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }

    /** Server address + capture key for the native side; token null keeps the stored one. */
    Function("configure") { enabled: Boolean, apiUrl: String, token: String? ->
      CaptureStore.configure(context, enabled, apiUrl, token)
      if (enabled) CaptureStore.flush(context)
      Unit
    }

    Function("getStatus") {
      mapOf(
        "enabled" to CaptureStore.isEnabled(context),
        "configured" to CaptureStore.isConfigured(context),
        "queued" to CaptureStore.queueSize(context),
      )
    }

    /** Android 13+: asks the system to add the quick-settings tile (one tap). */
    AsyncFunction("requestAddTile") { promise: Promise ->
      if (Build.VERSION.SDK_INT >= 33) requestTile(promise) else promise.resolve("unsupported")
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
