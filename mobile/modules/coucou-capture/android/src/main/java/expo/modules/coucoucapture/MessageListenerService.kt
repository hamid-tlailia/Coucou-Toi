package expo.modules.coucoucapture

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat

/**
 * Picks customer messages out of messaging-app notifications and queues them
 * for analysis. Only the four messaging apps are looked at; group chats, the
 * merchant's own messages, calls and media placeholders are skipped.
 */
class MessageListenerService : NotificationListenerService() {
  companion object {
    val SOURCES = mapOf(
      "com.whatsapp" to "whatsapp", "com.whatsapp.w4b" to "whatsapp",
      "com.instagram.android" to "instagram", "com.instagram.lite" to "instagram",
      "com.facebook.orca" to "facebook", "com.facebook.mlite" to "facebook", "com.facebook.katana" to "facebook",
      "com.zhiliaoapp.musically" to "tiktok", "com.ss.android.ugc.trill" to "tiktok", "com.zhiliaoapp.musically.go" to "tiktok",
    )
    // "📷 Photo", "🎤 Voice message (0:12)", "Sticker", missed calls… — nothing to read.
    private val PLACEHOLDER = Regex("^\\s*(‎)?(📷|🎥|🎤|🎵|📄|📞|📍|👤|🖼|GIF\\b|Sticker\\b|Missed (voice|video) call)")
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    try {
      handle(sbn)
    } catch (e: Exception) {
      // A malformed notification from another app must never crash this service.
    }
  }

  private fun handle(sbn: StatusBarNotification) {
    val source = SOURCES[sbn.packageName] ?: return
    if (!CaptureStore.isEnabled(this) || !CaptureStore.isConfigured(this)) return
    val n = sbn.notification
    if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    if (n.flags and Notification.FLAG_ONGOING_EVENT != 0) return
    if (n.category == Notification.CATEGORY_CALL) return

    var added = false
    val style = NotificationCompat.MessagingStyle.extractMessagingStyleFromNotification(n)
    if (style != null) {
      if (style.isGroupConversation) return
      val me = style.user.name?.toString()
      val title = style.conversationTitle?.toString()
      for (m in style.messages) {
        val person = m.person ?: continue // null = written by the merchant
        val name = person.name?.toString()
        if (name != null && name == me) continue
        val text = m.text?.toString()?.trim() ?: continue
        if (text.isEmpty() || PLACEHOLDER.containsMatchIn(text)) continue
        CaptureStore.add(this, source, title ?: name, text)
        added = true
      }
    } else {
      val extras = n.extras
      val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim()
      val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT))
        ?.toString()?.trim()
      if (title.isNullOrEmpty() || text.isNullOrEmpty() || PLACEHOLDER.containsMatchIn(text)) return
      CaptureStore.add(this, source, title, text)
      added = true
    }
    if (added) CaptureStore.flush(this)
  }

  override fun onListenerConnected() {
    // Anything left over from a failed attempt goes out as soon as we're running.
    if (CaptureStore.queueSize(this) > 0) CaptureStore.flush(this)
  }
}
