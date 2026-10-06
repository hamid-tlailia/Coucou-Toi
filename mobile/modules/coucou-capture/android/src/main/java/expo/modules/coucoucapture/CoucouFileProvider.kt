package expo.modules.coucoucapture

import androidx.core.content.FileProvider

/** Own subclass so this provider never clashes with other libraries' FileProvider entries. */
class CoucouFileProvider : FileProvider()
