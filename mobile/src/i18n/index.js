const ar = {
  dir: 'rtl',
  appName: 'Coco Love',
  // tabs
  tabHome: 'الرئيسية', tabOrders: 'الطلبات', tabSmart: 'المساعد', tabScan: 'المسح', tabProfile: 'الإعدادات',
  // common
  all: 'الكل', save: 'حفظ', cancel: 'إلغاء', close: 'إغلاق', delete: 'حذف', edit: 'تعديل', confirm: 'تأكيد',
  error: 'حدث خطأ، حاول مرة أخرى', offline: 'تعذّر الاتصال بالخادم', required: 'يرجى تعبئة الحقول الأساسية',
  retry: 'إعادة المحاولة', seeAll: 'عرض الكل', today: 'اليوم', days: 'يوم',
  // statuses
  st_new: 'جديد', st_processing: 'قيد التجهيز', st_shipped: 'تم الشحن', st_delivered: 'تم التسليم',
  pay_paid: 'مدفوع', pay_unpaid: 'غير مدفوع', pay_cod: 'عند الاستلام',
  src_whatsapp: 'واتساب', src_instagram: 'انستغرام', src_facebook: 'فيسبوك', src_tiktok: 'تيك توك', src_manual: 'يدوي',
  // auth
  welcome: 'أهلاً بك', authSub: 'إدارة طلبات متجرك بأناقة',
  signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', email: 'البريد الإلكتروني', password: 'كلمة المرور',
  fullName: 'الاسم الكامل', storeName: 'اسم المتجر', haveAccount: 'لديك حساب؟ سجّل الدخول', noAccount: 'ليس لديك حساب؟ أنشئ واحداً',
  badEmail: 'بريد إلكتروني غير صالح', badPass: 'كلمة المرور ٨ أحرف على الأقل', badLogin: 'البريد أو كلمة المرور غير صحيحة', emailTaken: 'هذا البريد مستخدم مسبقاً',
  unlockPrompt: 'افتح القفل للمتابعة', locked: 'التطبيق مقفل', unlock: 'فتح القفل',
  // dashboard
  goodMorning: 'صباح الخير', goodEvening: 'مساء الخير', dashboard: 'لوحة التحكم',
  revenue: 'إجمالي الإيرادات', collected: 'المحصّل', outstanding: 'غير محصّل', totalOrders: 'عدد الطلبات', avgOrder: 'متوسط الطلب',
  vsPrev: 'مقارنة بالفترة السابقة', ordersToday: 'طلبات اليوم', revenueToday: 'مبيعات اليوم',
  appVisits: 'زيارات التطبيق', trackingViews: 'مشاهدات التتبع', visits: 'الزيارات', visitsHint: 'فتح التطبيق، وفتح العملاء لروابط تتبع طلباتهم',
  revenueChart: 'المبيعات', ordersChart: 'الطلبات', byStatus: 'حسب الحالة', bySource: 'حسب المصدر',
  topCustomers: 'أفضل العملاء', topCities: 'أكثر المدن طلباً', aiFunnel: 'البائع الذكي',
  d_pending: 'بانتظار المراجعة', d_approved: 'تمت الموافقة', d_rejected: 'مرفوضة',
  collectionRate: 'نسبة التحصيل', noData: 'لا توجد بيانات بعد', ordersCount: 'طلب',
  // orders
  searchPlaceholder: 'ابحث بالاسم، الهاتف، المدينة أو رقم الطلب', noOrders: 'لا توجد طلبات بعد', noOrdersSub: 'اضغط + لإضافة أول طلب',
  addOrder: 'طلب جديد', editOrder: 'تعديل الطلب', source: 'مصدر الطلب', customer: 'اسم العميل', phone: 'رقم الهاتف',
  city: 'المدينة / العنوان', products: 'المنتجات', amount: 'المبلغ', payStatus: 'الدفع', status: 'حالة الطلب',
  createOrder: 'حفظ وإنشاء الفاتورة', orderNo: 'طلب', trackingCode: 'كود التتبع', copied: 'تم النسخ',
  invoice: 'الفاتورة', sendWa: 'إرسال للعميل', call: 'اتصال', copyLink: 'رابط التتبع',
  deleteOrder: 'حذف الطلب', deleteConfirm: 'هل تريد حذف هذا الطلب نهائياً؟', deleted: 'تم حذف الطلب', updated: 'تم التحديث',
  waMsg: 'مرحباً {name} 🌸\nتم تأكيد طلبك رقم {no}\n{items}\nالمبلغ: {total}\nتابع طلبك من هنا: {link}',
  // invoice
  sharePdf: 'مشاركة PDF', print: 'طباعة', invoiceNo: 'فاتورة رقم', date: 'التاريخ', billTo: 'العميل',
  total: 'الإجمالي', thanks: 'شكراً لثقتكم 🤍', scanToTrack: 'امسح الرمز لتتبع طلبك', description: 'الوصف',
  // smart
  smartTitle: 'البائع الذكي', smartHint: 'الصق رسالة العميل وسيستخرج الذكاء الاصطناعي الطلب تلقائياً',
  pastePlaceholder: 'الصق هنا رسالة العميل من واتساب أو انستغرام…', paste: 'لصق', extract: 'استخراج الطلب',
  extracting: 'جارٍ التحليل…', drafts: 'طلبات بانتظار المراجعة', smartEmpty: 'لا توجد طلبات مقترحة حالياً',
  rawMessage: 'الرسالة الأصلية', confidence: 'الثقة', approveOrder: 'موافقة وإنشاء', rejectOrder: 'رفض',
  approvedToast: 'تم إنشاء الطلب', rejectedToast: 'تم رفض الطلب', missingFields: 'يرجى تعبئة الاسم والهاتف والمبلغ',
  draftCreated: 'تمت إضافة الطلب للمراجعة', aiNoKey: 'لم يتم ضبط مفتاح الذكاء الاصطناعي على الخادم، عدّل الحقول يدوياً',
  // scan
  scanTitle: 'فحص الطلب', scanHint: 'وجّه الكاميرا نحو رمز QR على الفاتورة', manualCode: 'أو أدخل رقم الطلب', check: 'فحص',
  notFound: 'لم يتم العثور على الطلب', markPaid: 'تحديد كمدفوع', confirmDelivery: 'تأكيد التسليم', scanAgain: 'مسح طلب آخر', openOrder: 'تفاصيل الطلب',
  cameraDenied: 'نحتاج إذن الكاميرا لمسح الرموز', allowCamera: 'السماح بالكاميرا',
  // notifications
  notifications: 'الإشعارات', noNotifications: 'لا توجد إشعارات', markAllRead: 'تحديد الكل كمقروء',
  // profile
  storeInfo: 'معلومات المتجر', storeInfoHint: 'تظهر على الفواتير وصفحة التتبع', storePhone: 'هاتف المتجر', storeAddress: 'عنوان المتجر',
  yourName: 'اسمك', saved: 'تم الحفظ', preferences: 'التفضيلات', language: 'اللغة', theme: 'المظهر', dark: 'داكن', light: 'فاتح',
  security: 'الأمان والإشعارات', appLock: 'قفل التطبيق بالبصمة', pushNotif: 'إشعارات الهاتف',
  pushOn: 'مفعّلة', pushOff: 'غير مفعّلة', pushLocal: 'مفعّلة داخل التطبيق', logout: 'تسجيل الخروج', server: 'الخادم', version: 'الإصدار',
  timeAgoNow: 'الآن', minutes: 'د', hours: 'س',
};

const en = {
  dir: 'ltr',
  tabHome: 'Home', tabOrders: 'Orders', tabSmart: 'Assistant', tabScan: 'Scan', tabProfile: 'Settings',
  all: 'All', save: 'Save', cancel: 'Cancel', close: 'Close', delete: 'Delete', edit: 'Edit', confirm: 'Confirm',
  error: 'Something went wrong', offline: 'Cannot reach the server', required: 'Please fill the required fields',
  retry: 'Retry', seeAll: 'See all', today: 'Today', days: 'days',
  st_new: 'New', st_processing: 'Preparing', st_shipped: 'Shipped', st_delivered: 'Delivered',
  pay_paid: 'Paid', pay_unpaid: 'Unpaid', pay_cod: 'Cash on delivery',
  src_whatsapp: 'WhatsApp', src_instagram: 'Instagram', src_facebook: 'Facebook', src_tiktok: 'TikTok', src_manual: 'Manual',
  welcome: 'Welcome', authSub: 'Manage your store orders, elegantly',
  signIn: 'Sign in', signUp: 'Create account', email: 'Email', password: 'Password',
  fullName: 'Full name', storeName: 'Store name', haveAccount: 'Have an account? Sign in', noAccount: 'No account? Create one',
  badEmail: 'Invalid email', badPass: 'Password must be 8+ characters', badLogin: 'Wrong email or password', emailTaken: 'Email already in use',
  unlockPrompt: 'Unlock to continue', locked: 'App locked', unlock: 'Unlock',
  goodMorning: 'Good morning', goodEvening: 'Good evening', dashboard: 'Dashboard',
  revenue: 'Total revenue', collected: 'Collected', outstanding: 'Outstanding', totalOrders: 'Orders', avgOrder: 'Average order',
  vsPrev: 'vs previous period', ordersToday: 'Orders today', revenueToday: 'Sales today',
  appVisits: 'App visits', trackingViews: 'Tracking views', visits: 'Visits', visitsHint: 'App opens and customers opening their tracking links',
  revenueChart: 'Sales', ordersChart: 'Orders', byStatus: 'By status', bySource: 'By source',
  topCustomers: 'Top customers', topCities: 'Top cities', aiFunnel: 'Smart Seller',
  d_pending: 'Awaiting review', d_approved: 'Approved', d_rejected: 'Rejected',
  collectionRate: 'Collection rate', noData: 'No data yet', ordersCount: 'orders',
  searchPlaceholder: 'Search name, phone, city or order no.', noOrders: 'No orders yet', noOrdersSub: 'Tap + to add your first order',
  addOrder: 'New order', editOrder: 'Edit order', source: 'Source', customer: 'Customer name', phone: 'Phone',
  city: 'City / address', products: 'Products', amount: 'Amount', payStatus: 'Payment', status: 'Status',
  createOrder: 'Save & create invoice', orderNo: 'Order', trackingCode: 'Tracking code', copied: 'Copied',
  invoice: 'Invoice', sendWa: 'Send to customer', call: 'Call', copyLink: 'Tracking link',
  deleteOrder: 'Delete order', deleteConfirm: 'Delete this order permanently?', deleted: 'Order deleted', updated: 'Updated',
  waMsg: 'Hello {name} 🌸\nYour order {no} is confirmed\n{items}\nTotal: {total}\nTrack it here: {link}',
  sharePdf: 'Share PDF', print: 'Print', invoiceNo: 'Invoice no.', date: 'Date', billTo: 'Bill to',
  total: 'Total', thanks: 'Thank you 🤍', scanToTrack: 'Scan to track your order', description: 'Description',
  smartTitle: 'Smart Seller', smartHint: 'Paste a customer message and AI will extract the order',
  pastePlaceholder: 'Paste the customer message from WhatsApp or Instagram…', paste: 'Paste', extract: 'Extract order',
  extracting: 'Analyzing…', drafts: 'Awaiting review', smartEmpty: 'No suggested orders',
  rawMessage: 'Original message', confidence: 'Confidence', approveOrder: 'Approve & create', rejectOrder: 'Reject',
  approvedToast: 'Order created', rejectedToast: 'Order rejected', missingFields: 'Please fill name, phone and amount',
  draftCreated: 'Added for review', aiNoKey: 'AI key is not set on the server — fill the fields manually',
  scanTitle: 'Check an order', scanHint: 'Point the camera at the invoice QR code', manualCode: 'Or type the order number', check: 'Check',
  notFound: 'Order not found', markPaid: 'Mark as paid', confirmDelivery: 'Confirm delivery', scanAgain: 'Scan another', openOrder: 'Order details',
  cameraDenied: 'Camera permission is needed to scan', allowCamera: 'Allow camera',
  notifications: 'Notifications', noNotifications: 'No notifications', markAllRead: 'Mark all as read',
  storeInfo: 'Store details', storeInfoHint: 'Shown on invoices and the tracking page', storePhone: 'Store phone', storeAddress: 'Store address',
  yourName: 'Your name', saved: 'Saved', preferences: 'Preferences', language: 'Language', theme: 'Theme', dark: 'Dark', light: 'Light',
  security: 'Security & notifications', appLock: 'Biometric app lock', pushNotif: 'Phone notifications',
  pushOn: 'On', pushOff: 'Off', pushLocal: 'In-app only', logout: 'Sign out', server: 'Server', version: 'Version',
  timeAgoNow: 'now', minutes: 'm', hours: 'h',
};

const fr = {
  ...en,
  tabHome: 'Accueil', tabOrders: 'Commandes', tabSmart: 'Assistant', copyLink: 'Lien de suivi', tabScan: 'Scanner', tabProfile: 'Réglages',
  all: 'Tout', save: 'Enregistrer', cancel: 'Annuler', close: 'Fermer', delete: 'Supprimer', edit: 'Modifier', confirm: 'Confirmer',
  error: 'Une erreur est survenue', offline: 'Serveur injoignable', required: 'Champs obligatoires manquants',
  retry: 'Réessayer', today: "Aujourd'hui", days: 'jours',
  st_new: 'Nouvelle', st_processing: 'En préparation', st_shipped: 'Expédiée', st_delivered: 'Livrée',
  pay_paid: 'Payée', pay_unpaid: 'Impayée', pay_cod: 'À la livraison', src_manual: 'Manuel',
  welcome: 'Bienvenue', authSub: 'Gérez vos commandes avec élégance', signIn: 'Se connecter', signUp: 'Créer un compte',
  password: 'Mot de passe', fullName: 'Nom complet', storeName: 'Nom de la boutique',
  haveAccount: 'Déjà un compte ? Se connecter', noAccount: 'Pas de compte ? En créer un',
  goodMorning: 'Bonjour', goodEvening: 'Bonsoir', dashboard: 'Tableau de bord',
  revenue: "Chiffre d'affaires", collected: 'Encaissé', outstanding: 'À encaisser', totalOrders: 'Commandes', avgOrder: 'Panier moyen',
  vsPrev: 'vs période précédente', ordersToday: "Commandes du jour", revenueToday: 'Ventes du jour',
  appVisits: "Visites de l'app", trackingViews: 'Vues du suivi', visits: 'Visites',
  revenueChart: 'Ventes', ordersChart: 'Commandes', byStatus: 'Par statut', bySource: 'Par source',
  topCustomers: 'Meilleurs clients', topCities: 'Villes principales', aiFunnel: 'Vendeur IA',
  searchPlaceholder: 'Nom, téléphone, ville ou n° de commande', noOrders: 'Aucune commande',
  addOrder: 'Nouvelle commande', customer: 'Nom du client', phone: 'Téléphone', city: 'Ville / adresse', products: 'Produits',
  amount: 'Montant', payStatus: 'Paiement', status: 'Statut', createOrder: 'Enregistrer et facturer',
  invoice: 'Facture', sendWa: 'Envoyer au client', call: 'Appeler', deleteOrder: 'Supprimer la commande',
  sharePdf: 'Partager PDF', print: 'Imprimer', invoiceNo: 'Facture n°', billTo: 'Client', thanks: 'Merci 🤍',
  notifications: 'Notifications', markAllRead: 'Tout marquer comme lu',
  storeInfo: 'Infos boutique', preferences: 'Préférences', language: 'Langue', theme: 'Thème', dark: 'Sombre', light: 'Clair',
  logout: 'Déconnexion',
};

export const STRINGS = { ar, en, fr };

/** Arabic by default; French/English can be chosen in Settings. */
export function deviceLang() {
  return 'ar';
}

/** "{name} ..." template filler for translated sentences. */
export const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
