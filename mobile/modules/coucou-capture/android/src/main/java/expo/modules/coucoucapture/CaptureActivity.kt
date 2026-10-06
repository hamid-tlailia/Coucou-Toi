package expo.modules.coucoucapture

import android.app.Activity
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle

/**
 * Invisible screen opened by the quick-settings tile (reads the copied text —
 * Android only lets the focused app read the clipboard, hence this screen)
 * or from the text-selection menu (receives the selected text). Sends the
 * text for analysis and closes at once.
 */
class CaptureActivity : Activity() {
  private var handled = false

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (intent?.action == Intent.ACTION_PROCESS_TEXT) {
      val text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()
      handled = true
      send(text)
    }
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (!hasFocus || handled) return
    handled = true
    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val text = clipboard.primaryClip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.coerceToText(this)?.toString()
    send(text)
  }

  private fun send(raw: String?) {
    val text = raw?.trim().orEmpty()
    when {
      !CaptureStore.isConfigured(this) -> CaptureStore.toast(this, "افتح Coucou Toi وفعّل الالتقاط من الإعدادات")
      text.length < 3 -> CaptureStore.toast(this, "انسخ رسالة العميل أولاً ثم اضغط الزر")
      else -> CaptureStore.sendNow(this, text)
    }
    finish()
    overridePendingTransition(0, 0)
  }
}
