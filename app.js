/* ══════════════════════════════════════════════
   NSF 3D — app.js
   ══════════════════════════════════════════════
   הקובץ הזה מרכז את כל ה-JS של האתר. שינויים בשלב הזה:
   1. SITE_CONFIG — מקום אחד להדליק/לכבות סקשנים ופיצ'רים
   2. אבטחה: honeypot + throttle בטופס, caching לקריאות ל-Workers
   3. escapeHTML — מניעת XSS בתוכן שמגיע מ-Notion/Workers
   4. רינדור לסקשנים החדשים: חנות (ציוד מיובא) ומאמרים
   5. 🌐 I18N — מילון תרגומים למחרוזות דינמיות. קובץ JS אחד משותף
      לכל 3 השפות (he/en/ru) — הבחירה נקבעת לפי document.documentElement.lang.
   ══════════════════════════════════════════════ */

// ┌──────────────────────────────────────────────────────────────┐
// │  🌐 I18N — מילון תרגומים למחרוזות שנוצרות דינמית ב-JS         │
// │  כל שאר טקסטי האתר חיים ישירות ב-HTML של כל שפה (he/en/ru).   │
// └──────────────────────────────────────────────────────────────┘
const LANG = (document.documentElement.lang || 'he').slice(0,2);
const I18N = {
  he: {
    days: ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'],
    stockAsOf: (d,dow) => `נכון בתאריך: ${d} (יום ${dow})`,
    liveDot: 'מלאי חי',
    inStock: '✓ במלאי', outOfStock: '✗ אזל',
    sku: 'מק"ט', stock: 'מלאי', notes: 'הערות',
    zoomIn: 'לחצו להגדלה',
    waColorMsg: (name, sku) => `היי NSF 3D! 👋\nאני מעוניין בצבע: ${name} (מק"ט: ${sku})\n\nאשמח לשמוע פרטים 😊`,
    matHeader: { corner1:'עמידות ל-', corner2:'חומר', load:'נשיאת משקל<br>קבוע', impact:'מכות<br>ונפילות', heat:'חום', uv:'קרינת שמש<br>(UV)', chemical:'כימית', suits:'למה מתאים' },
    matLegend: { good:'מעולה', mid:'בינוני', bad:'חלש' },
    formSending: '⏳ שולח...',
    formSubmit: '✉️ שלח פניה →',
    formThrottled: '⚠️ נשלחה פנייה לפני רגע — נא להמתין דקה לפני שליחה נוספת.',
    formErrorDefault: '⚠️ שגיאה בשליחה. נסו שוב או פנו ישירות בוואטסאפ.',
    formNeedTurnstile: '⚠️ נא לאשר שאתם לא רובוט (סמן/י את תיבת האימות) ולנסות שוב.',
    alertNamePhone: 'נא למלא שם וטלפון',
    alertPhoneInvalid: 'נא להזין מספר טלפון תקין (9-15 ספרות)',
    alertMessageShort: 'נא לפרט מעט יותר מה אתם צריכים (לפחות כמה מילים)',
    alertConsent: 'יש לאשר את מדיניות הפרטיות לפני שליחת הפנייה',
    darkModeOn: 'מצב כהה', darkModeOff: 'מצב בהיר',
    defaultWaMsg: 'היי NSF 3D! 👋 אשמח לשמוע פרטים 😊',
    emailSubject: 'פנייה מהאתר — NSF 3D',
    emailBody: 'היי NSF 3D,\n\nפונה אליכם מהאתר.\n\n',
    colorsLoadError: '⚠️ שגיאה בטעינת הצבעים. נסו לרענן.',
    showLess: 'הצג פחות ↑',
    showAllColors: (n) => `הצג את כל ${n} הצבעים ↓`,
    glowTag: 'זוהר בחושך', specialTag: 'מיוחד',
    noColorsFound: 'לא נמצאו צבעים',
    projectsLoadError: '⚠️ שגיאה בטעינת הפרויקטים.',
    contactUsDirect: 'צרו קשר ישירות',
    waProjectMsg: (name) => `היי NSF 3D! 👋\nראיתי את הפרויקט "${name}" באתר ואני רוצה משהו דומה.\nאשמח לשמוע פרטים ומחיר 😊`,
    featuredBadge: '⭐ מומלץ',
    orderSimilar: 'הזמינו כזה ←',
    orderSimilarAria: (name) => `הזמינו פרויקט דומה ל-${name} בוואטסאפ`,
    showFewerProjects: 'הצג פחות ↑', showMoreProjects: 'הצג עוד פרויקטים ↓',
    projectsComingTitle: 'פרויקטים בדרך — בקרוב!',
    projectsComingDesc: (link) => `בינתיים ${link} ונראה מה נוכל לעשות יחד`,
    sendUsMsg: 'שלחו לנו הודעה',
    showFewerMaterials: 'הצג פחות ↑', showAllMaterials: 'לצפייה בכל החומרים ↓',
    shopComingTitle: 'המוצרים בדרך — בקרוב בחנות',
    waShopMsg: (name) => `היי NSF 3D! 👋\nמעוניין במוצר: ${name}\nאשמח לפרטים ולתיאום רכישה 😊`,
    onRequest: 'לפי בקשה',
    articlesComingTitle: 'מאמרים ראשונים בדרך 📝',
    readMore: 'קראו עוד ←',
    detailsAndPurchase: 'פרטים ורכישה',
  },
  en: {
    days: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    stockAsOf: (d,dow) => `Updated: ${d} (${dow})`,
    liveDot: 'Live stock',
    inStock: '✓ In stock', outOfStock: '✗ Out of stock',
    sku: 'SKU', stock: 'Stock', notes: 'Notes',
    zoomIn: 'Click to enlarge',
    waColorMsg: (name, sku) => `Hi NSF 3D! 👋\nI'm interested in the color: ${name} (SKU: ${sku})\n\nI'd love to hear more details 😊`,
    matHeader: { corner1:'Resistance to', corner2:'material', load:'Constant<br>load bearing', impact:'Impact &<br>drops', heat:'Heat', uv:'UV<br>exposure', chemical:'Chemical', suits:'Best for' },
    matLegend: { good:'Excellent', mid:'Medium', bad:'Low' },
    formSending: '⏳ Sending...',
    formSubmit: '✉️ Send message →',
    formThrottled: '⚠️ A message was just sent — please wait a minute before sending another.',
    formErrorDefault: '⚠️ Something went wrong. Try again or reach us directly on WhatsApp.',
    formNeedTurnstile: '⚠️ Please confirm you\'re not a robot (check the verification box) and try again.',
    alertNamePhone: 'Please fill in your name and phone number',
    alertPhoneInvalid: 'Please enter a valid phone number (9-15 digits)',
    alertMessageShort: 'Please add a bit more detail about what you need (a few words at least)',
    alertConsent: 'Please accept the privacy policy before sending your message',
    darkModeOn: 'Dark mode', darkModeOff: 'Light mode',
    defaultWaMsg: 'Hi NSF 3D! 👋 I\'d love to hear more details 😊',
    emailSubject: 'Website inquiry — NSF 3D',
    emailBody: 'Hi NSF 3D,\n\nI\'m reaching out from your website.\n\n',
    colorsLoadError: '⚠️ Error loading colors. Please refresh.',
    showLess: 'Show less ↑',
    showAllColors: (n) => `Show all ${n} colors ↓`,
    glowTag: 'Glow in the dark', specialTag: 'Special',
    noColorsFound: 'No colors found',
    projectsLoadError: '⚠️ Error loading projects.',
    contactUsDirect: 'Contact us directly',
    waProjectMsg: (name) => `Hi NSF 3D! 👋\nI saw the "${name}" project on your website and I'd like something similar.\nI'd love to hear details and pricing 😊`,
    featuredBadge: '⭐ Featured',
    orderSimilar: 'Order something like this ←',
    orderSimilarAria: (name) => `Order a project similar to ${name} on WhatsApp`,
    showFewerProjects: 'Show less ↑', showMoreProjects: 'Show more projects ↓',
    projectsComingTitle: 'Projects coming soon!',
    projectsComingDesc: (link) => `In the meantime, ${link} and let's see what we can create together`,
    sendUsMsg: 'send us a message',
    showFewerMaterials: 'Show less ↑', showAllMaterials: 'View all materials ↓',
    shopComingTitle: 'Products coming soon to the shop',
    waShopMsg: (name) => `Hi NSF 3D! 👋\nI'm interested in: ${name}\nI'd love details and to arrange a purchase 😊`,
    onRequest: 'On request',
    articlesComingTitle: 'First articles coming soon 📝',
    readMore: 'Read more ←',
    detailsAndPurchase: 'Details & purchase',
  },
  ru: {
    days: ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],
    stockAsOf: (d,dow) => `Обновлено: ${d} (${dow})`,
    liveDot: 'Актуальный склад',
    inStock: '✓ В наличии', outOfStock: '✗ Нет в наличии',
    sku: 'Артикул', stock: 'Наличие', notes: 'Примечания',
    zoomIn: 'Нажмите для увеличения',
    waColorMsg: (name, sku) => `Привет, NSF 3D! 👋\nМеня интересует цвет: ${name} (артикул: ${sku})\n\nБуду рад(а) узнать подробности 😊`,
    matHeader: { corner1:'Устойчивость к-', corner2:'материал', load:'Постоянная<br>нагрузка', impact:'Удары и<br>падения', heat:'Тепло', uv:'УФ-<br>излучение', chemical:'Химическая', suits:'Подходит для' },
    matLegend: { good:'Отлично', mid:'Средне', bad:'Слабо' },
    formSending: '⏳ Отправка...',
    formSubmit: '✉️ Отправить →',
    formThrottled: '⚠️ Сообщение уже было отправлено — подождите минуту перед повторной отправкой.',
    formErrorDefault: '⚠️ Ошибка отправки. Попробуйте снова или напишите нам напрямую в WhatsApp.',
    formNeedTurnstile: '⚠️ Пожалуйста, подтвердите, что вы не робот (отметьте галочку) и попробуйте снова.',
    alertNamePhone: 'Пожалуйста, укажите имя и телефон',
    alertPhoneInvalid: 'Пожалуйста, введите корректный номер телефона (9-15 цифр)',
    alertMessageShort: 'Пожалуйста, опишите чуть подробнее, что вам нужно (хотя бы несколько слов)',
    alertConsent: 'Пожалуйста, примите политику конфиденциальности перед отправкой',
    darkModeOn: 'Тёмный режим', darkModeOff: 'Светлый режим',
    defaultWaMsg: 'Привет, NSF 3D! 👋 Буду рад(а) узнать подробности 😊',
    emailSubject: 'Обращение с сайта — NSF 3D',
    emailBody: 'Здравствуйте, NSF 3D,\n\nПишу вам с сайта.\n\n',
    colorsLoadError: '⚠️ Ошибка загрузки цветов. Попробуйте обновить страницу.',
    showLess: 'Свернуть ↑',
    showAllColors: (n) => `Показать все цвета (${n}) ↓`,
    glowTag: 'Светится в темноте', specialTag: 'Особый',
    noColorsFound: 'Цвета не найдены',
    projectsLoadError: '⚠️ Ошибка загрузки проектов.',
    contactUsDirect: 'Связаться напрямую',
    waProjectMsg: (name) => `Привет, NSF 3D! 👋\nЯ увидел(а) проект «${name}» на сайте и хочу что-то похожее.\nБуду рад(а) узнать подробности и цену 😊`,
    featuredBadge: '⭐ Рекомендуем',
    orderSimilar: 'Заказать похожее ←',
    orderSimilarAria: (name) => `Заказать проект, похожий на ${name}, в WhatsApp`,
    showFewerProjects: 'Свернуть ↑', showMoreProjects: 'Показать больше проектов ↓',
    projectsComingTitle: 'Проекты уже скоро!',
    projectsComingDesc: (link) => `А пока ${link} — и посмотрим, что мы можем сделать вместе`,
    sendUsMsg: 'напишите нам',
    showFewerMaterials: 'Свернуть ↑', showAllMaterials: 'Смотреть все материалы ↓',
    shopComingTitle: 'Товары в магазине уже скоро',
    waShopMsg: (name) => `Привет, NSF 3D! 👋\nМеня интересует товар: ${name}\nБуду рад(а) узнать подробности и договориться о покупке 😊`,
    onRequest: 'По запросу',
    articlesComingTitle: 'Первые статьи уже скоро 📝',
    readMore: 'Читать далее ←',
    detailsAndPurchase: 'Подробности и покупка',
  }
};
const T = I18N[LANG] || I18N.he;

// ┌──────────────────────────────────────────────────────────────┐
// │  ⚙️  SITE_CONFIG — הדלקה/כיבוי של סקשנים ופיצ'רים           │
// │  enabled:true/false שולט אם הסקשן מוצג באתר (גם בניווט       │
// │  וגם בפוטר). הסדר באתר נקבע לפי הסדר ב-HTML עצמו — לא כאן.   │
// └──────────────────────────────────────────────────────────────┘
const SITE_CONFIG = {
  sections: {
    projects: { enabled: true  },   // פרויקטים לדוגמה
    catalog:  { enabled: true  },   // קטלוג צבעים/חומרים
    shop:     { enabled: false },   // ✅ חנות ציוד מיובא (דיזות/פילמנט/מייבשים) — דלוק כשיהיה מלאי
    products: { enabled: true  },   // "מה אפשר להדפיס" — שירות ההדפסה
    pricing:  { enabled: true  },
    order:    { enabled: true  },
    materials:{ enabled: true  },   // ✅ טבלת השוואת חומרי הדפסה — מידע קבוע, לא תלוי "מאמרים"
    resinMaterials:{ enabled: false }, // ✅ טבלת חומרי רזין — כבוי עד שתכיר את התחום ותאשר את התוכן
    articles: { enabled: false },   // ✅ מאמרים/כתבות — דלוק כשיהיה תוכן
    reviews:  { enabled: false },   // ✅ כבוי כרגע — Placeholder, תדליק כשיהיו ביקורות אמיתיות
    about:    { enabled: true  },
    faq:      { enabled: true  },
    social:   { enabled: true  },
    contact:  { enabled: true  },
  },
  features: {
    expressTrack:     false, // 🔕 הוסר מהאתר לבקשת הבעלים (מבלבל/מיותר בשלב זה)
    multicolorBanner: true,
    saleBadges:       true,
    paymentMethods:   { bit: true, payBox: true, cash: true, bankTransfer: true, creditCard: false }, // creditCard לעתיד הרחוק
  }
};

// ┌──────────────────────────────────────────────────────────────┐
// │  🛒 SHOP_PRODUCTS — מוצרי חנות (ציוד מיובא, לא הדפסות)       │
// │  ערוך ידנית כאן עד שיהיה לך CMS ייעודי לחנות.                │
// └──────────────────────────────────────────────────────────────┘
// ┌──────────────────────────────────────────────────────────────┐
// │  🧪 הגדרות תצוגה לטבלת החומרים — true/false להראות/להחביא    │
// │  עמודה. הדאטה (מחיר/קושי) נשארת בקובץ, רק לא מוצגת.          │
// └──────────────────────────────────────────────────────────────┘
const MATERIALS_TABLE_OPTIONS = {
  showPrice:      false,
  showDifficulty: false,
  showFoodSafe:   false,
};

const SHOP_PRODUCTS = [
  // לדוגמה, מלא בהמשך:
  // { name:"דיזת נחושת 0.4mm", desc:"דיזה איכותית להדפסה מהירה ועמידה", price:35, image:"", inStock:true },
];

// ┌──────────────────────────────────────────────────────────────┐
// │  📝 ARTICLES — מאמרים/כתבות קצרות                            │
// └──────────────────────────────────────────────────────────────┘
const ARTICLES = [
  // { title:"PLA מול PETG — מה ההבדל?", date:"01/2026", excerpt:"...", image:"", url:"#" },
];

// ┌──────────────────────────────────────────────────────────────┐
// │  🧪 MATERIALS — טבלת השוואת חומרי הדפסה                      │
// │  5 קטגוריות עמידות, כל אחת בערך 1-3 (1=חלש · 2=בינוני · 3=מעולה) │
// │  load = נשיאת משקל קבוע · impact = מכות ונפילות · heat = חום  │
// │  uv = קרינת שמש · chemical = עמידות כימית                     │
// │  suits = 3-5 מילים "למה מתאים" (תורם ל-SEO ולהחלטת הלקוח)     │
// │  הסדר בקוד = הסדר בטבלה: בסיסי → נפוץ/הנדסי בסיסי → גמיש →    │
// │  הנדסי מתקדם → מחוזק-סיבים (heat/load עולים בהדרגה).          │
// │  לעריכה עצמאית: כל ערך הוא פשוט מספר 1/2/3.                   │
// └──────────────────────────────────────────────────────────────┘
// suits ניתן כאובייקט {he,en,ru} — נבחר בזמן ריצה לפי LANG (ראה MATERIALS_LOCALIZED למטה)
const MATERIALS_RAW = [
  { name:"PLA",        load:1, impact:1, heat:1, uv:1, chemical:1, suits:{
      he:"פסלונים · דגמי נוי · מתנות", en:"Figurines · decorative models · gifts", ru:"Фигурки · декоративные модели · подарки" } },
  { name:"PETG",       load:2, impact:2, heat:2, uv:2, chemical:2, suits:{
      he:"מארזים · חלקים טכניים · תגים", en:"Enclosures · technical parts · tags", ru:"Корпуса · технические детали · таблички" } },
  { name:"TPU",        load:1, impact:3, heat:2, uv:1, chemical:2, suits:{
      he:"אטמים · בולמי זעזועים · כיסויי הגנה", en:"Seals · shock absorbers · protective covers", ru:"Уплотнители · амортизаторы · защитные чехлы" } },
  { name:"ASA",        load:2, impact:2, heat:2, uv:3, chemical:2, suits:{
      he:"שילוט חוץ · אביזרי גינה · אביזרים לרכב", en:"Outdoor signage · garden accessories · automotive parts", ru:"Уличные вывески · садовые аксессуары · автозапчасти" } },
  { name:"ABS",        load:2, impact:2, heat:2, uv:1, chemical:2, suits:{
      he:"מארזי אלקטרוניקה · חלקים מכניים · כיסויים קשיחים", en:"Electronics enclosures · mechanical parts · rigid covers", ru:"Корпуса электроники · механические детали · жёсткие крышки" } },
  { name:"PA (Nylon)", load:2, impact:3, heat:3, uv:1, chemical:2, suits:{
      he:"גלגלי שיניים · צירים · חלקי מכונה", en:"Gears · hinges · machine parts", ru:"Шестерни · петли · детали механизмов" } },
  { name:"PC",         load:3, impact:3, heat:3, uv:1, chemical:2, suits:{
      he:"מגנים · תושבות עומס · חלקים קשיחים", en:"Guards · load-bearing mounts · rigid parts", ru:"Защитные кожухи · нагруженные крепления · жёсткие детали" } },
  { name:"PP",         load:1, impact:3, heat:2, uv:1, chemical:3, suits:{
      he:"מכסים · צירים חיים · מיכלים לכימיכלים", en:"Lids · living hinges · chemical containers", ru:"Крышки · «живые» петли · ёмкости для химикатов" } },
  { name:"PPA-CF",     load:3, impact:2, heat:3, uv:2, chemical:3, suits:{
      he:"תושבות מכניות · חלקים עמידים בחום", en:"Mechanical mounts · heat-resistant parts", ru:"Механические крепления · термостойкие детали" } },
  { name:"PPS-CF",     load:3, impact:2, heat:3, uv:3, chemical:3, suits:{
      he:"חלקים עמידים בחום · סביבה כימית · עומסים מבניים", en:"Heat-resistant parts · chemical environments · structural loads", ru:"Термостойкие детали · химическая среда · конструкционные нагрузки" } },
];
const MATERIALS = MATERIALS_RAW.map(m => ({ ...m, suits: m.suits[LANG] || m.suits.he }));

// ┌──────────────────────────────────────────────────────────────┐
// │  🧫 RESIN_MATERIALS — טבלת חומרי רזין (טיוטה ראשונית!)        │
// │  הסקשן כבוי (resinMaterials.enabled=false) עד שתאשר/תערוך.   │
// └──────────────────────────────────────────────────────────────┘
const RESIN_MATERIALS_RAW = [
  { name:"Standard Resin", meaning:{he:"שרף סטנדרטי",en:"Standard resin",ru:"Стандартная смола"}, suits:{he:"דמויות · מיניאטורות · פרטים זעירים",en:"Figurines · miniatures · fine details",ru:"Фигурки · миниатюры · мелкие детали"}, strength:"mid",
    heat:{level:"mid",temp:"~55°C"}, moisture:"mid", uv:"bad", chemical:"mid", flex:"bad", foodSafe:"bad", difficulty:"good", price:1 },
  { name:"Tough / Durable Resin", meaning:{he:"שרף קשיח ועמיד",en:"Tough / durable resin",ru:"Прочная смола"}, suits:{he:"חלקים פונקציונליים · פרוטוטייפים",en:"Functional parts · prototypes",ru:"Функциональные детали · прототипы"}, strength:"good",
    heat:{level:"mid",temp:"~60°C"}, moisture:"mid", uv:"bad", chemical:"mid", flex:"mid", foodSafe:"bad", difficulty:"mid", price:2 },
  { name:"Flexible Resin", meaning:{he:"שרף גמיש",en:"Flexible resin",ru:"Гибкая смола"}, suits:{he:"אטמים · מודלים גמישים",en:"Seals · flexible models",ru:"Уплотнители · гибкие модели"}, strength:"mid",
    heat:{level:"bad",temp:"~45°C"}, moisture:"mid", uv:"bad", chemical:"bad", flex:"good", foodSafe:"bad", difficulty:"mid", price:2 },
  { name:"High-Temp Resin", meaning:{he:"שרף עמיד חום גבוה",en:"High-temp resin",ru:"Термостойкая смола"}, suits:{he:"תבניות יציקה · חלקי חום",en:"Casting molds · heat-exposed parts",ru:"Литейные формы · термонагруженные детали"}, strength:"good",
    heat:{level:"good",temp:"~120°C"}, moisture:"mid", uv:"bad", chemical:"good", flex:"bad", foodSafe:"bad", difficulty:"bad", price:3 },
  { name:"Water-Washable Resin", meaning:{he:"שרף נשטף במים",en:"Water-washable resin",ru:"Смола, смываемая водой"}, suits:{he:"עבודה נוחה · דמויות בסיסיות",en:"Easy workflow · basic figurines",ru:"Удобство в работе · базовые фигурки"}, strength:"mid",
    heat:{level:"bad",temp:"~50°C"}, moisture:"bad", uv:"bad", chemical:"bad", flex:"bad", foodSafe:"bad", difficulty:"good", price:2 },
];
const RESIN_MATERIALS = RESIN_MATERIALS_RAW.map(m => ({ ...m, meaning: m.meaning[LANG]||m.meaning.he, suits: m.suits[LANG]||m.suits.he }));

const COLORS_DATA_URL   = "/data/colors.json";
const PROJECTS_DATA_URL = "/data/projects.json";
// ✅ שליחת הטופס עוברת עכשיו דרך Worker בצד שרת — הדפדפן לא שולח ל-EmailJS ישירות יותר
// (Worker זה גם מאמת את Turnstile בעצמו, כך שאין יותר צורך ב-Worker נפרד לאימות)
const CONTACT_WORKER_URL = "https://nsf3d-contact.nsf3d-il.workers.dev/";

const WA_NUMBER    = "972559144386";
const WA_MSG       = encodeURIComponent(T.defaultWaMsg);
const EMAIL_ADDR   = "nsf3d.il@gmail.com";
const EMAIL_SUBJECT= encodeURIComponent(T.emailSubject);
const EMAIL_BODY   = encodeURIComponent(T.emailBody);
const SITE_URL     = "https://nsf3d.co.il/";
function getDefaultShow(){ return window.innerWidth <= 768 ? 4 : 6; }
const PROJECTS_DEFAULT_SHOW = 3;

// ══════════════════════════════════════════════
//  🔔 SITE ANNOUNCEMENT
// ══════════════════════════════════════════════
const ANNOUNCEMENT_I18N = {
  he: {
    title: "האתר והעסק כרגע בשלבי הקמה!",
    text: `כלל השירותים לא יהיו זמינים במהלך החודשים הקרובים, למעט פרויקטים חריגים שיכולים להתקבל לפי בקשה, לכל נושא אחר ניתן לדבר איתנו בווטסאפ.`,
    btnWa: "📱 דברו איתנו בוואטסאפ", btnClose: "אוקיי, אמשיך לגלוש",
    footerNote: "📍 באר שבע · משלוחים לכל הארץ · מענה מהיר"
  },
  en: {
    title: "The website and business are currently being set up!",
    text: `Most services won't be available over the coming months, except for special projects considered on request. For anything else, feel free to reach us on WhatsApp.`,
    btnWa: "📱 Message us on WhatsApp", btnClose: "OK, keep browsing",
    footerNote: "📍 Beer Sheva · Nationwide shipping · Fast response"
  },
  ru: {
    title: "Сайт и бизнес сейчас находятся в стадии запуска!",
    text: `Большинство услуг будет недоступно в ближайшие месяцы, за исключением отдельных проектов по запросу. По любым другим вопросам пишите нам в WhatsApp.`,
    btnWa: "📱 Написать нам в WhatsApp", btnClose: "Хорошо, продолжить",
    footerNote: "📍 Беэр-Шева · Доставка по всей стране · Быстрый ответ"
  }
};
const ANN_T = ANNOUNCEMENT_I18N[LANG] || ANNOUNCEMENT_I18N.he;
const SITE_ANNOUNCEMENT = {
  enabled: false,
  id: "site-construction-v1",
  persistence: "always",
  delay: 500,
  icon: "🚧",
  title: ANN_T.title,
  text: ANN_T.text,
  buttons: [
    { type:"wa", label:ANN_T.btnWa, href:"__WA__" },
    { type:"secondary", label:ANN_T.btnClose, action:"close" }
  ],
  footerNote: ANN_T.footerNote
};

// ══════════════════════════════════════════════
//  SOCIALS
// ══════════════════════════════════════════════
const SOCIAL_NAMES = {
  he: { facebook:"פייסבוק", instagram:"אינסטגרם", tiktok:"טיקטוק", youtube:"יוטיוב" },
  en: { facebook:"Facebook", instagram:"Instagram", tiktok:"TikTok", youtube:"YouTube" },
  ru: { facebook:"Facebook", instagram:"Instagram", tiktok:"TikTok", youtube:"YouTube" },
};
const SN = SOCIAL_NAMES[LANG] || SOCIAL_NAMES.he;
const SOCIALS = [
  { url:"https://www.facebook.com/profile.php?id=61586093829404", name:SN.facebook, handle:"NSF.3D", color:"#1877F2",
    svg:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>` },
  { url:"https://www.instagram.com/nsf.3d/", name:SN.instagram, handle:"@nsf.3d", color:"#E1306C",
    svg:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>` },
  { url:"https://www.tiktok.com/@nsf.3d", name:SN.tiktok, handle:"@nsf.3d", color:"#000000",
    svg:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/></svg>` },
  { url:"https://www.youtube.com/@NSFchannel", name:SN.youtube, handle:"NSFchannel", color:"#FF0000",
    svg:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>` },
];

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
let allColors=[], showingAll=false, activeFilter='popular', currentModalColor=null;
let allProjects=[], projectsShowingAll=false;

// ══════════════════════════════════════════════
//  🛡️ SECURITY HELPERS
// ══════════════════════════════════════════════

// מונע XSS: כל טקסט שמגיע ממקור חיצוני (Notion/Worker) עובר escape
// לפני שהוא מוזרק ל-innerHTML.
function escapeHTML(str){
  if(str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// גרסה לשימוש בתוך attribute (onclick='...') — מחמירה יותר על מירכאות
function escapeAttr(str){
  return escapeHTML(str).replace(/`/g, '&#96;');
}

// (cachedFetchJSON הוסר — התוכן נטען כעת כקבצי JSON סטטיים מאותו דומיין,
//  ראה loadColors/loadProjects, שהם מהירים מיידית בזכות ה-HTTP cache הרגיל
//  של הדפדפן ולא צריכים שכבת קאש נפרדת ב-sessionStorage.)

// ══════════════════════════════════════════════
//  ⚙️ SECTION CONFIG ENGINE
// ══════════════════════════════════════════════
function applySiteConfig(){
  Object.entries(SITE_CONFIG.sections).forEach(([key, cfg]) => {
    const section = document.getElementById(key);
    if(section && !cfg.enabled){
      section.style.display = 'none';
      const divider = section.previousElementSibling;
      if(divider && divider.classList && divider.classList.contains('sdiv')) divider.style.display = 'none';
    }
    // הסתרת קישורי ניווט (תפריט עליון + תפריט מובייל + פוטר) לסקשנים כבויים
    document.querySelectorAll(`[data-section="${key}"]`).forEach(link => {
      const li = link.closest('li');
      (li || link).style.display = cfg.enabled ? '' : 'none';
    });
  });
}

// ══════════════════════════════════════════════
//  COOKIE
// ══════════════════════════════════════════════
function getCookieConsent(){ return localStorage.getItem('nsf-cookie-consent'); }
function acceptCookies(){ localStorage.setItem('nsf-cookie-consent','all'); closeCookieBanner(); loadFbPixel(); }
function declineCookies(){ localStorage.setItem('nsf-cookie-consent','none'); closeCookieBanner(); }
function closeCookieBanner(){ document.getElementById('cookieBanner').style.display='none'; }
function loadFbPixel(){ console.log('[NSF3D] Facebook Pixel loaded after consent'); }

// ══════════════════════════════════════════════
//  ANNOUNCEMENT POPUP
// ══════════════════════════════════════════════
function initAnnouncement(){
  const a = SITE_ANNOUNCEMENT;
  if(!a.enabled) return;

  const key = 'nsf-announce-' + a.id;
  const mode = a.persistence ?? 'forever';

  if(mode === 'forever'){
    if(localStorage.getItem(key) === '1') return;
  } else if(mode === 'session'){
    if(sessionStorage.getItem(key) === '1') return;
  } else if(typeof mode === 'number' && mode > 0){
    const saved = localStorage.getItem(key);
    if(saved){
      const hoursAgo = (Date.now() - parseInt(saved)) / (1000 * 60 * 60);
      if(hoursAgo < mode) return;
    }
  }

  const overlay = document.getElementById('announceOverlay');
  if(!overlay) return;

  document.getElementById('announceIcon').textContent = a.icon || '';
  document.getElementById('announceTitle').textContent = a.title || '';
  document.getElementById('announceText').innerHTML = a.text || '';
  document.getElementById('announceFooter').textContent = a.footerNote || '';

  const btnsEl = document.getElementById('announceBtns');
  const waLink = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;
  btnsEl.innerHTML = (a.buttons || []).map(b => {
    const href = b.href === '__WA__' ? waLink : (b.href || '#');
    if(b.action === 'close'){
      return `<button class="announce-btn-${b.type || 'secondary'}" onclick="closeAnnounce()">${b.label}</button>`;
    }
    if(b.type === 'wa'){
      return `<a class="announce-btn-wa" href="${href}" target="_blank" rel="noopener noreferrer">${b.label}</a>`;
    }
    return `<a class="announce-btn-${b.type || 'primary'}" href="${href}" ${href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${b.label}</a>`;
  }).join('');

  setTimeout(()=>{
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }, a.delay || 600);
}
function closeAnnounce(){
  const a = SITE_ANNOUNCEMENT;
  const overlay = document.getElementById('announceOverlay');
  if(!overlay) return;
  overlay.style.opacity = '0';
  setTimeout(()=>{
    overlay.classList.remove('open');
    overlay.style.opacity = '';
    document.body.style.overflow = '';
  }, 300);

  const key = 'nsf-announce-' + a.id;
  const mode = a.persistence ?? 'forever';
  if(mode === 'forever'){
    localStorage.setItem(key, '1');
  } else if(mode === 'session'){
    sessionStorage.setItem(key, '1');
  } else if(typeof mode === 'number' && mode > 0){
    localStorage.setItem(key, String(Date.now()));
  }
}

function initCookieBanner(){
  const consent = getCookieConsent();
  if(!consent){ setTimeout(()=>{ document.getElementById('cookieBanner').style.display='block'; }, 1500); }
  else if(consent==='all'){ loadFbPixel(); }
}

// ══════════════════════════════════════════════
//  DARK MODE
// ══════════════════════════════════════════════
(function(){ if(localStorage.getItem('nsf-dark')==='1') document.body.classList.add('dark'); })();
function toggleDark(){
  const d=document.body.classList.toggle('dark');
  localStorage.setItem('nsf-dark',d?'1':'0');
  document.getElementById('darkIcon').textContent=d?'☀️':'🌙';
  document.getElementById('darkLabel').textContent=d?T.darkModeOff:T.darkModeOn;
}

// ══════════════════════════════════════════════
//  DOM READY
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  // (emailjs.init הוסר — השליחה עוברת כעת דרך Worker בצד שרת, ראה submitForm)

  applySiteConfig();
  initActiveSection();

  if(document.body.classList.contains('dark')){
    document.getElementById('darkIcon').textContent='☀️';
    document.getElementById('darkLabel').textContent=T.darkModeOff;
  }

  const localNum = '0' + WA_NUMBER.slice(3).replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
  document.getElementById('waDisplay').textContent = localNum;
  document.getElementById('mailDisplay').textContent = EMAIL_ADDR;
  document.getElementById('waCard').href = `https://wa.me/${WA_NUMBER}?text=${WA_MSG}`;
  document.getElementById('mailCard').href = `mailto:${EMAIL_ADDR}?subject=${EMAIL_SUBJECT}&body=${EMAIL_BODY}`;

  const sg = document.getElementById('socialGrid');
  if(sg) sg.innerHTML = SOCIALS.map(v=>`
    <a href="${v.url}" target="_blank" rel="noopener noreferrer" class="social-card">
      <div class="social-icon" style="color:${v.color}">${v.svg}</div>
      <div><div class="social-name">${v.name}</div><div class="social-handle">${v.handle}</div></div>
    </a>`).join('');

  initAnnouncement();
  initCookieBanner();

  const btt = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    btt.classList.toggle('visible', window.scrollY > 300);
  }, { passive: true });

  loadColors();
  loadProjects();
  if(SITE_CONFIG.sections.materials.enabled)      renderMaterialsSection();
  if(SITE_CONFIG.sections.resinMaterials.enabled) renderResinSection();
  if(SITE_CONFIG.sections.shop.enabled)     renderShop();
  if(SITE_CONFIG.sections.articles.enabled) renderArticles();
  initA11y();

  const dateEl = document.getElementById('catalogDate');
  if(dateEl){
    const days = T.days;
    const now = new Date();
    // ⚠️ העדכון היומי "נכנס לתוקף" רק מ-08:00 בבוקר — לפני השעה הזו (כולל כל שעות הלילה
    // שלאחר חצות) ממשיכים להציג את התאריך של היום הקודם, כי בפועל המלאי עדיין לא התעדכן.
    if(now.getHours() < 8) now.setDate(now.getDate() - 1);
    // ⚠️ לא מציגים שהעדכון "התרחש" בשישי/שבת (לכבד לקוחות שומרי שבת) —
    // גם אם בפועל יש עדכון אוטומטי, מציגים את תאריך יום חמישי הקרוב שלפניו.
    const dow = now.getDay(); // 0=ראשון ... 5=שישי, 6=שבת
    if(dow === 5)      now.setDate(now.getDate() - 1); // שישי → חמישי
    else if(dow === 6) now.setDate(now.getDate() - 2); // שבת → חמישי
    const d = now.getDate().toString().padStart(2,'0');
    const m = (now.getMonth()+1).toString().padStart(2,'0');
    const y = now.getFullYear();
    dateEl.innerHTML = `<span class="live-dot" title="${T.liveDot}"></span> ${T.stockAsOf(`${d}/${m}/${y}`, days[now.getDay()])}`;
  }
});

// ══════════════════════════════════════════════
//  NAV ACTIVE SECTION
// ══════════════════════════════════════════════
function initActiveSection(){
  const sectionIds = Object.keys(SITE_CONFIG.sections).concat(['hero']);
  const navItems = document.querySelectorAll('.nav-links a[data-section]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        const id = entry.target.id;
        navItems.forEach(link => {
          link.classList.toggle('nav-active', link.getAttribute('data-section') === id);
        });
      }
    });
  }, { rootMargin: '-64px 0px -55% 0px', threshold: 0 });
  sectionIds.forEach(id => { const el = document.getElementById(id); if(el) observer.observe(el); });
}

// ══════════════════════════════════════════════
//  COLORS CATALOG
// ══════════════════════════════════════════════
function renderSkeletons(count=12){
  const grid = document.getElementById('colorsGrid');
  grid.innerHTML = Array.from({length:count},(_,i)=>`
    <div class="skeleton-card" aria-hidden="true" style="animation-delay:${i*0.06}s">
      <div class="skeleton-swatch"></div>
      <div class="skeleton-info">
        <div class="skeleton-line" style="width:78%;margin-bottom:8px"></div>
        <div class="skeleton-line" style="width:52%;margin-bottom:6px"></div>
        <div class="skeleton-line" style="width:38%"></div>
      </div>
    </div>`).join('');
}

async function loadColors(){
  renderSkeletons(6);
  try{
    // ✅ טעינה ישירה מקובץ JSON סטטי באותו דומיין — אין יותר תלות ב-Worker/Notion
    // בזמן אמת, ולכן אין יותר עיכוב רשת חיצוני. הדפדפן גם שומר את הקובץ בקאש
    // הרגיל שלו (HTTP cache), כך שטעינות חוזרות מהירות עוד יותר.
    const res  = await fetch(COLORS_DATA_URL);
    const data = await res.json();
    allColors = (data.colors||[]).filter(c=>c.name&&c.name!=='ללא שם');
    filterColors();
  }catch(e){
    document.getElementById('colorsGrid').innerHTML=`<div class="loading" style="grid-column:1/-1">${T.colorsLoadError}</div>`;
  }
}

function setFilter(f,btn){
  activeFilter=f; showingAll=false;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  filterColors();
}

function updateShowAllButtons(show, total, list){
  const rowBottom = document.getElementById('showAllRow');
  const rowTop    = document.getElementById('showAllRowTop');
  const btnBottom = document.getElementById('showAllBtn');
  const btnTop    = document.getElementById('showAllBtnTop');
  if(show){
    const label = showingAll ? T.showLess : T.showAllColors(total);
    rowBottom.style.display = 'block';
    btnBottom.textContent   = label;
    rowTop.style.display  = showingAll ? 'block' : 'none';
    btnTop.textContent    = showingAll ? T.showLess : label;
  } else {
    rowBottom.style.display = 'none';
    rowTop.style.display    = 'none';
  }
}

// ⚠️ 'זוהר בחושך' כאן נשאר בעברית בכוונה — זהו ערך הנתונים בפועל בתוך
// data/colors.json (משותף לכל השפות כרגע), לא טקסט תצוגה. ראה הערת I18N למעלה.
function filterColors(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  let list = [...allColors];
  if(activeFilter==='glow')         list = list.filter(c=>c.finishes.includes('זוהר בחושך'));
  else if(activeFilter==='regular') list = list.filter(c=>!c.finishes.includes('זוהר בחושך') && !c.special);
  else if(activeFilter==='special') list = list.filter(c=>c.special === true);
  else if(activeFilter==='instock') list = list.filter(c=>c.inStock === true);
  else if(activeFilter==='outstock')list = list.filter(c=>c.inStock === false);
  if(q) list = list.filter(c=>c.name.toLowerCase().includes(q)||c.sku.toLowerCase().includes(q));

  const defaultShow = getDefaultShow();
  const canTruncate = !q && activeFilter === 'popular' && list.length > defaultShow;
  updateShowAllButtons(canTruncate, list.length, list);
  renderColors(canTruncate && !showingAll ? list.slice(0, defaultShow) : list);
}

function toggleShowAll(){ showingAll=!showingAll; filterColors(); if(!showingAll){ document.getElementById('catalog').scrollIntoView({behavior:'smooth'}); } }
function isHex(h){ return /^#[0-9A-Fa-f]{6}$/.test(h); }

function renderColors(list){
  const grid = document.getElementById('colorsGrid');
  if(!list.length){ grid.innerHTML=`<div class="loading" style="grid-column:1/-1">${T.noColorsFound}</div>`; return; }
  window._catalogList = list;
  grid.innerHTML = list.map((c,i)=>{
    const hex = isHex(c.hex)?c.hex:null;
    const isGlow = c.finishes.includes('זוהר בחושך');
    const posY = c.imgPos != null ? c.imgPos + '%' : (isGlow ? '83%' : '50%');
    const imgPos = `object-position:center ${posY};`;
    // ✅ escape — c.image מגיע ממקור חיצוני (Notion), חשוב לא להזריק אותו גולמי
    const safeImg  = escapeAttr(c.image || '');
    const safeName = escapeHTML(c.name);
    const safeSku  = escapeHTML(c.sku);
    const sw = c.image
      ? `<img src="${safeImg}" alt="${safeName}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;${imgPos}" onerror="this.style.display='none'">`
      : `<div class="color-swatch-block" style="background:${hex||'#9ab4c8'}"></div>`;
    const inStock = c.inStock === true;
    return `<div class="color-card" onclick="openModal(${i})" role="listitem" tabindex="0" onkeydown="if(event.key==='Enter')openModal(${i})">
      <div class="color-swatch" aria-hidden="true">${sw}</div>
      <div class="color-info">
        <div class="color-name">${safeName}</div>
        <div class="color-meta">
          <span class="color-sku">${T.sku}: ${safeSku}</span>
        </div>
        <div class="color-meta" style="margin-top:4px">
          ${isGlow?`<span class="tag-glow">✨ ${T.glowTag}</span>`:''}
          ${c.special?`<span class="tag-special">💎 ${T.specialTag}</span>`:''}
          ${inStock?`<span class="tag-instock">${T.inStock}</span>`:`<span class="tag-outstock">${T.outOfStock}</span>`}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════
//  PROJECTS
// ══════════════════════════════════════════════
async function loadProjects(){
  try{
    // ✅ טעינה ישירה מקובץ JSON סטטי — אין יותר תלות ב-Worker/Notion בזמן אמת
    const res   = await fetch(PROJECTS_DATA_URL);
    const data  = await res.json();
    allProjects = data.projects || [];
    renderProjects(allProjects.slice(0, PROJECTS_DEFAULT_SHOW));
    updateProjectsShowMoreButtons(allProjects.length > PROJECTS_DEFAULT_SHOW);
  }catch(e){
    document.getElementById('projectsGrid').innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text2)">${T.projectsLoadError} <a href="#contact" style="color:var(--blue-mid);font-weight:700">${T.contactUsDirect}</a></div>`;
  }
}

function renderProjects(list){
  const grid = document.getElementById('projectsGrid');
  if(!list.length){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text2)">
      <div style="font-size:40px;margin-bottom:12px">🖨️</div>
      <div style="font-size:16px;font-weight:700">${T.projectsComingTitle}</div>
      <div style="font-size:14px;margin-top:6px">${T.projectsComingDesc(`<a href="#contact" style="color:var(--blue-mid);font-weight:700">${T.sendUsMsg}</a>`)}</div>
    </div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const safeName = escapeHTML(p.name);
    const safeDesc  = p.description ? escapeHTML(p.description) : '';
    const safeCat   = p.category ? escapeHTML(p.category) : '';
    const safeImg   = escapeAttr(p.image || '');

    const defaultMsg = encodeURIComponent(T.waProjectMsg(p.name));
    const waMsg = p.waMsg ? encodeURIComponent(p.waMsg) : defaultMsg;

    const imgHtml = p.image
      ? `<img src="${safeImg}" alt="${safeName}" loading="lazy" decoding="async" style="cursor:zoom-in" onclick="event.stopPropagation();openLightbox(this.src)" onerror="this.parentElement.innerHTML='<div class=project-img-placeholder>🖨️</div>'">`
      : `<div class="project-img-placeholder">🖨️</div>`;

    const featuredBadge = p.featured ? `<div class="project-featured-badge">${T.featuredBadge}</div>` : '';
    const catBadge = safeCat ? `<div class="project-category-badge">${safeCat}</div>` : '';

    return `
      <div class="project-card${p.featured?' featured':''}">
        <div class="project-img-wrap">
          ${imgHtml}
          ${featuredBadge}
          ${catBadge}
        </div>
        <div class="project-body">
          <div class="project-name">${safeName}</div>
          ${safeDesc ? `<div class="project-desc">${safeDesc}</div>` : ''}
          <a href="https://wa.me/${WA_NUMBER}?text=${waMsg}"
             target="_blank"
             rel="noopener noreferrer"
             class="project-wa-btn"
             aria-label="${T.orderSimilarAria(safeName)}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            ${T.orderSimilar}
          </a>
        </div>
      </div>`;
  }).join('');
}

function updateProjectsShowMoreButtons(show){
  const rowBottom = document.getElementById('projectsShowMore');
  const rowTop    = document.getElementById('projectsShowMoreTop');
  const btnBottom = document.getElementById('projectsShowMoreBtn');
  const btnTop    = document.getElementById('projectsShowMoreBtnTop');
  if(show){
    const label = projectsShowingAll ? T.showFewerProjects : T.showMoreProjects;
    rowBottom.style.display = 'block';
    btnBottom.textContent   = label;
    rowTop.style.display    = projectsShowingAll ? 'block' : 'none';
    btnTop.textContent      = label;
  } else {
    rowBottom.style.display = 'none';
    rowTop.style.display    = 'none';
  }
}

function toggleProjectsShowAll(){
  projectsShowingAll = !projectsShowingAll;
  if(projectsShowingAll){
    renderProjects(allProjects);
  } else {
    renderProjects(allProjects.slice(0, PROJECTS_DEFAULT_SHOW));
    document.getElementById('projects').scrollIntoView({behavior:'smooth'});
  }
  updateProjectsShowMoreButtons(allProjects.length > PROJECTS_DEFAULT_SHOW);
}

// ══════════════════════════════════════════════
//  MATERIALS — אקורדיון לטבלת ההשוואה
// ══════════════════════════════════════════════
function toggleMaterialsTable(forceOpen){
  const restBody = document.getElementById('materialsRestBody');
  const btn      = document.getElementById('materialsToggleBtn');
  const rowTop   = document.getElementById('materialsShowMoreTop');
  const btnTop   = document.getElementById('materialsToggleBtnTop');
  if(!restBody || !btn) return;
  const isOpen = typeof forceOpen === 'boolean' ? forceOpen : (restBody.style.display === 'none');
  const collapseLabel = T.showFewerMaterials;
  const expandLabel   = T.showAllMaterials;
  restBody.style.display = isOpen ? 'table-row-group' : 'none';
  btn.textContent = isOpen ? collapseLabel : expandLabel;
  if(rowTop && btnTop){
    rowTop.style.display = isOpen ? 'block' : 'none';
    btnTop.textContent = collapseLabel;
  }
  if(isOpen){
    restBody.scrollIntoView({behavior:'smooth', block:'nearest'});
  } else {
    document.getElementById('materials').scrollIntoView({behavior:'smooth'});
  }
}

// ══════════════════════════════════════════════
//  🛒 SHOP — ציוד מיובא (לא הדפסות)
// ══════════════════════════════════════════════
function renderShop(){
  const grid = document.getElementById('shopGrid');
  if(!grid) return;
  if(!SHOP_PRODUCTS.length){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text2)">
      <div style="font-size:40px;margin-bottom:12px">📦</div>
      <div style="font-size:16px;font-weight:700">${T.shopComingTitle}</div>
    </div>`;
    return;
  }
  grid.innerHTML = SHOP_PRODUCTS.map(p => {
    const safeName = escapeHTML(p.name);
    const safeDesc = p.desc ? escapeHTML(p.desc) : '';
    const safeImg  = escapeAttr(p.image || '');
    const inStock  = p.inStock !== false;
    const imgHtml = p.image
      ? `<img src="${safeImg}" alt="${safeName}" loading="lazy" decoding="async">`
      : `<div class="shop-img-placeholder">📦</div>`;
    const msg = encodeURIComponent(T.waShopMsg(p.name));
    return `
      <div class="shop-card">
        <div class="shop-img-wrap">
          ${imgHtml}
          <span class="shop-stock-badge ${inStock?'in':'out'}">${inStock?T.inStock:T.outOfStock}</span>
        </div>
        <div class="shop-body">
          <div class="shop-name">${safeName}</div>
          ${safeDesc ? `<div class="shop-desc">${safeDesc}</div>` : ''}
          <div class="shop-price-row"><span class="shop-price">${p.price ? p.price + ' ₪' : T.onRequest}</span></div>
          <a class="shop-btn" href="https://wa.me/${WA_NUMBER}?text=${msg}" target="_blank" rel="noopener noreferrer">📱 ${T.detailsAndPurchase}</a>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════════
//  📝 ARTICLES
// ══════════════════════════════════════════════
function renderArticles(){
  const grid = document.getElementById('articlesGrid');
  if(!grid) return;
  if(!ARTICLES.length){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text2)">${T.articlesComingTitle}</div>`;
    return;
  }
  grid.innerHTML = ARTICLES.map(a => {
    const safeTitle = escapeHTML(a.title);
    const safeExcerpt = a.excerpt ? escapeHTML(a.excerpt) : '';
    const safeImg = escapeAttr(a.image || '');
    const safeDate = a.date ? escapeHTML(a.date) : '';
    const href = a.url || '#contact';
    const imgHtml = a.image
      ? `<img src="${safeImg}" alt="${safeTitle}" loading="lazy" decoding="async">`
      : `<div class="article-img-placeholder">📝</div>`;
    return `
      <a class="article-card" href="${escapeAttr(href)}">
        <div class="article-img-wrap">${imgHtml}</div>
        <div class="article-body">
          ${safeDate ? `<div class="article-date">${safeDate}</div>` : ''}
          <div class="article-title">${safeTitle}</div>
          ${safeExcerpt ? `<div class="article-excerpt">${safeExcerpt}</div>` : ''}
          <span class="article-readmore">${T.readMore}</span>
        </div>
      </a>`;
  }).join('');
}

// ══════════════════════════════════════════════
//  🧪 MATERIALS TABLE
// ══════════════════════════════════════════════
// מד-כוכבים (Star Indicator) — 3 כוכבים בגוון זהב (var(--gold-mid),
// מסתגל אוטומטית לבהיר/כהה): good = 3/3 · mid = 2/3 · bad = 1/3.
// כוכב מלא גדול ומוצק, כוכב ריק קטן וחלול (קו מתאר בלבד).
const MAT_DOTS_TOTAL = 3;
const MAT_LEVEL_DOTS = { good: 3, mid: 2, bad: 1 };
const MAT_STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z";
const PRICE_LABEL = { 1:'₪', 2:'₪₪', 3:'₪₪₪' };
// חומרים שמוצגים גלויים תמיד בטבלה (ללא לחיצה) — הנפוצים והמוכרים ביותר ללקוח רגיל
const MATERIALS_PREVIEW_NAMES = ['PLA','PETG','TPU','ASA'];

// מציג מד כוכבים בודד לרמה נתונה (level מספרי 1-3, או מחרוזת good/mid/bad לתאימות)
function matDots(level){
  const filled = typeof level === 'number' ? level : (MAT_LEVEL_DOTS[level] || 0);
  let stars = '';
  for(let i=1;i<=MAT_DOTS_TOTAL;i++){
    if(i<=filled){
      stars += `<svg class="mat-star mat-star-filled" viewBox="0 0 24 24" fill="currentColor"><path d="${MAT_STAR_PATH}"/></svg>`;
    } else {
      stars += `<svg class="mat-star" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="${MAT_STAR_PATH}"/></svg>`;
    }
  }
  return `<span class="mat-dots">${stars}</span>`;
}

// matCell מקבל ערך תא: מחרוזת רמה רגילה ('good'/'mid'/'bad'), או — לשורות
// CF/GF שמתנהגות אחרת בכל גרסה — אובייקט {cf:'...', gf:'...'} שמוצג כשני
// מדים זה מעל זה עם תווית CF/GF.
function matCell(value){
  if(value && typeof value === 'object'){
    return `<div class="mat-dual">
      <div class="mat-dual-row"><span class="mat-dual-label">CF</span>${matDots(value.cf)}</div>
      <div class="mat-dual-row"><span class="mat-dual-label">GF</span>${matDots(value.gf)}</div>
    </div>`;
  }
  return matDots(value);
}

function buildMaterialsTableHTML(list, previewNames){
  const buildRow = (m) => {
    const safeName  = escapeHTML(m.name);
    const safeSuits = m.suits ? escapeHTML(m.suits) : '';
    return `<tr>
      <td class="mat-name-cell"><div class="mat-name">${safeName}</div></td>
      <td>${matCell(m.load)}</td>
      <td>${matCell(m.impact)}</td>
      <td>${matCell(m.heat)}</td>
      <td>${matCell(m.uv)}</td>
      <td>${matCell(m.chemical)}</td>
      <td class="mat-suits-cell">${safeSuits}</td>
    </tr>`;
  };

  const activeList = list.filter(m => !m.disabled);
  let tbodyHTML;
  if(previewNames && previewNames.length){
    const previewList = activeList.filter(m => previewNames.includes(m.name));
    const restList     = activeList.filter(m => !previewNames.includes(m.name));
    tbodyHTML = `<tbody>${previewList.map(buildRow).join('')}</tbody>` +
                `<tbody id="materialsRestBody" style="display:none">${restList.map(buildRow).join('')}</tbody>`;
  } else {
    tbodyHTML = `<tbody>${activeList.map(buildRow).join('')}</tbody>`;
  }

  return `
    <div class="materials-table-wrap">
      <table class="materials-table">
        <thead>
          <tr>
            <th class="mat-corner-th">
              <div class="mat-corner">
                <span class="mat-corner-top">${T.matHeader.corner1}</span>
                <span class="mat-corner-bottom">${T.matHeader.corner2}</span>
              </div>
            </th>
            <th>${T.matHeader.load}</th>
            <th>${T.matHeader.impact}</th>
            <th>${T.matHeader.heat}</th>
            <th>${T.matHeader.uv}</th>
            <th>${T.matHeader.chemical}</th>
            <th>${T.matHeader.suits}</th>
          </tr>
        </thead>
        ${tbodyHTML}
      </table>
    </div>
    <div class="materials-legend">
      ${matDots(3)} ${T.matLegend.good} &nbsp;&nbsp;
      ${matDots(2)} ${T.matLegend.mid} &nbsp;&nbsp;
      ${matDots(1)} ${T.matLegend.bad}
    </div>`;
}

function renderMaterialsSection(){
  const grid = document.getElementById('materialsTableContainer');
  if(grid){
    grid.innerHTML = buildMaterialsTableHTML(MATERIALS, MATERIALS_PREVIEW_NAMES);
  }
}

function renderResinSection(){
  const grid = document.getElementById('resinTableContainer');
  if(grid){
    grid.innerHTML = buildMaterialsTableHTML(RESIN_MATERIALS);
  }
}


function openModal(indexOrObj){
  const c = typeof indexOrObj==='number' ? window._catalogList[indexOrObj] : indexOrObj;
  if(!c) return;
  currentModalColor = c;
  const hex = isHex(c.hex)?c.hex:null;
  const safeName = escapeHTML(c.name);
  if(c.image){
    const safeUrl = escapeAttr(c.image);
    document.getElementById('modalTop').innerHTML = `<img class="modal-img" src="${escapeAttr(c.image)}" alt="${safeName}" onclick="openLightbox('${safeUrl.replace(/'/g,"\\'")}')" title="${T.zoomIn}">`;
  } else {
    document.getElementById('modalTop').innerHTML = `<div class="modal-swatch" style="background:${hex||'#9ab4c8'}"></div>`;
  }
  document.getElementById('modalName').textContent = c.name;
  const inStock = c.inStock === true;
  const rows = [
    [T.sku, escapeHTML(c.sku||'—')],
    [T.stock, inStock ? T.inStock : T.outOfStock],
  ];
  if(c.notes) rows.push([T.notes, escapeHTML(c.notes)]);
  document.getElementById('modalRows').innerHTML = rows.map(([l,v])=>
    `<div class="modal-row"><span class="modal-row-label">${l}</span><span class="modal-row-val">${v}</span></div>`
  ).join('');
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function orderFromModal(){
  if(!currentModalColor) return;
  const c = currentModalColor;
  const msg = encodeURIComponent(T.waColorMsg(c.name, c.sku));
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`,'_blank','noopener');
}
function closeModal(e){ if(e.target===document.getElementById('modalOverlay')) closeModalDirect(); }
function closeModalDirect(){ document.getElementById('modalOverlay').classList.remove('open'); document.body.style.overflow=''; }

// ══════════════════════════════════════════════
//  LIGHTBOX
// ══════════════════════════════════════════════
function openLightbox(src, maxSizePx){
  const img = document.getElementById('lightboxImg');
  img.src = src;
  img.style.maxWidth  = maxSizePx ? maxSizePx + 'px' : '';
  img.style.maxHeight = maxSizePx ? maxSizePx + 'px' : '';
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox(){ document.getElementById('lightbox').classList.remove('open'); }

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ closeAnnounce(); closeModalDirect(); closeLegalDirect(); closeLightbox(); }
});

// ══════════════════════════════════════════════
//  📨 CONTACT FORM — עם honeypot + throttle
// ══════════════════════════════════════════════
const SUBMIT_MIN_INTERVAL_MS = 60 * 1000; // לא יותר מפנייה אחת בדקה מאותו דפדפן

async function submitForm(e){
  e.preventDefault();

  // ── 1. Honeypot — שדה מוסתר שבני-אדם לא ימלאו, בוטים בד"כ ממלאים אוטומטית ──
  const honeypot = document.getElementById('fwebsite');
  if(honeypot && honeypot.value.trim() !== ''){
    // לא מציגים שגיאה — רק "מדמים" הצלחה כדי לא לרמז לבוט שהוא נתפס
    document.getElementById('formSuccess').style.display='block';
    document.getElementById('contactForm').reset();
    return;
  }

  // ── 2. Throttle — מגביל קצב שליחות מאותו דפדפן ──
  const last = parseInt(localStorage.getItem('nsf-last-submit') || '0', 10);
  if(Date.now() - last < SUBMIT_MIN_INTERVAL_MS){
    const errEl = document.getElementById('formError');
    errEl.textContent = T.formThrottled;
    errEl.style.display='block';
    setTimeout(()=>{ errEl.style.display='none'; errEl.textContent=T.formErrorDefault; }, 5000);
    return;
  }

  const name    = document.getElementById('fname').value.trim();
  const phone   = document.getElementById('fphone').value.trim();
  const email   = document.getElementById('femail').value.trim();
  const subject = document.getElementById('fsubject').value;
  const message = document.getElementById('fmessage').value.trim();
  const consent = document.getElementById('fconsent');
  if(!name || !phone){ alert(T.alertNamePhone); return; }
  // ולידציה: טלפון — ספרות/מקף/פלוס/רווח בלבד, אורך סביר
  if(!/^[0-9\-\+\s]{9,15}$/.test(phone)){ alert(T.alertPhoneInvalid); return; }
  // ולידציה: פרטים — לפחות 5 תווים משמעותיים (לא רק רווחים)
  if(message.length < 5){ alert(T.alertMessageShort); return; }
  if(consent && !consent.checked){ alert(T.alertConsent); return; }

  // ── 3. Turnstile — אימות אנושי לפני שליחה בפועל ──
  const turnstileResponse = typeof turnstile !== 'undefined' ? turnstile.getResponse() : '';
  if(!turnstileResponse){
    const errEl0 = document.getElementById('formError');
    errEl0.textContent = T.formNeedTurnstile;
    errEl0.style.display='block';
    setTimeout(()=>{ errEl0.style.display='none'; errEl0.textContent=T.formErrorDefault; }, 5000);
    return;
  }

  const btn=document.getElementById('submitBtn'), success=document.getElementById('formSuccess'), errEl=document.getElementById('formError');
  btn.disabled=true; btn.textContent=T.formSending;
  success.style.display='none'; errEl.style.display='none';
  try{
    // ✅ קריאה יחידה ל-Worker: הוא מאמת את Turnstile ושולח את המייל בעצמו בצד שרת.
    // הדפדפן לא שולח ל-EmailJS ישירות יותר — אי אפשר לעקוף את הטופס ולשלוח מיילים
    // ישירות מהקונסול, כי המפתחות והלוגיקה נמצאים רק ב-Worker.
    const res  = await fetch(CONTACT_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: turnstileResponse,
        from_name: name, from_phone: phone, from_email: email, subject, message,
        website: honeypot ? honeypot.value : '' // honeypot נשלח גם לשרת כהגנה כפולה
      })
    });
    const data = await res.json();
    if(!data.success){
      throw new Error(data.error || 'send_failed');
    }

    success.style.display='block';
    document.getElementById('contactForm').reset();
    if(typeof turnstile !== 'undefined') turnstile.reset();
    localStorage.setItem('nsf-last-submit', String(Date.now()));
    setTimeout(()=>{ success.style.display='none'; }, 6000);
  }catch(err){
    console.error('[NSF3D] Email/Turnstile error:', err);
    errEl.style.display='block';
    if(typeof turnstile !== 'undefined') turnstile.reset();
  }
  btn.disabled=false; btn.textContent=T.formSubmit;
}

// ══════════════════════════════════════════════
//  MOBILE MENU
// ══════════════════════════════════════════════
function toggleMenu(){ document.getElementById('mobileMenu').classList.toggle('open'); }
function closeMenu(){ document.getElementById('mobileMenu').classList.remove('open'); }

// ══════════════════════════════════════════════
//  🌐 LANGUAGE SWITCHER
// ══════════════════════════════════════════════
function toggleLangMenu(){
  const menu = document.getElementById('langMenu');
  const btn  = document.querySelector('.lang-btn');
  const isOpen = menu.classList.toggle('open');
  if(btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}
// סגירת תפריט השפה בלחיצה מחוץ לו
document.addEventListener('click', (e)=>{
  const wrap = document.getElementById('langSwitch');
  if(wrap && !wrap.contains(e.target)){
    const menu = document.getElementById('langMenu');
    if(menu) menu.classList.remove('open');
  }
});

// ══════════════════════════════════════════════
//  ACCESSIBILITY
// ══════════════════════════════════════════════
let a11yFontLevel = 0;
const a11yFeatures = { contrast:false, links:false, noanim:false, cursor:false };

function initA11y(){
  const savedFont = parseInt(localStorage.getItem('nsf-a11y-font') || '0');
  if(savedFont){ a11yFontLevel = savedFont; applyZoom(a11yFontLevel); }
  ['contrast','links','noanim','cursor'].forEach(f => {
    if(localStorage.getItem('nsf-a11y-' + f) === '1'){
      a11yFeatures[f] = true;
      document.body.classList.add('a11y-' + f);
      const id = 'a11y' + f.charAt(0).toUpperCase() + f.slice(1);
      const btn = document.getElementById(id);
      if(btn){ btn.classList.add('active'); btn.setAttribute('aria-pressed','true'); }
    }
  });
}
function applyZoom(level){
  // CSS zoom נתמך כיום בכל הדפדפנים המרכזיים (כולל Firefox מגרסה 126, 2024) ומגדיל/מקטין
  // את כל התוכן באופן יחסי — ללא תלות ביחידות ה-px הקבועות שבהן בנוי שאר ה-CSS באתר.
  document.documentElement.style.zoom = level === 0 ? '' : ((16 + level * 2) / 16).toFixed(3);
}
function toggleA11yPanel(){ document.getElementById('a11yPanel').classList.toggle('open'); }
function changeFontSize(dir){
  a11yFontLevel = Math.max(-2, Math.min(3, a11yFontLevel + dir));
  applyZoom(a11yFontLevel);
  localStorage.setItem('nsf-a11y-font', a11yFontLevel);
}
function toggleA11yFeature(feature){
  a11yFeatures[feature] = !a11yFeatures[feature];
  document.body.classList.toggle('a11y-' + feature, a11yFeatures[feature]);
  const id = 'a11y' + feature.charAt(0).toUpperCase() + feature.slice(1);
  const btn = document.getElementById(id);
  if(btn){ btn.classList.toggle('active', a11yFeatures[feature]); btn.setAttribute('aria-pressed', String(a11yFeatures[feature])); }
  localStorage.setItem('nsf-a11y-' + feature, a11yFeatures[feature] ? '1' : '0');
}
function resetA11y(){
  a11yFontLevel = 0; applyZoom(0);
  Object.keys(a11yFeatures).forEach(f => {
    a11yFeatures[f] = false;
    document.body.classList.remove('a11y-' + f);
    const id = 'a11y' + f.charAt(0).toUpperCase() + f.slice(1);
    const btn = document.getElementById(id);
    if(btn){ btn.classList.remove('active'); btn.setAttribute('aria-pressed','false'); }
    localStorage.removeItem('nsf-a11y-' + f);
  });
  localStorage.removeItem('nsf-a11y-font');
}
document.addEventListener('click', function(e){
  const panel = document.getElementById('a11yPanel');
  const btn   = document.getElementById('a11yBtn');
  if(panel && panel.classList.contains('open') && !panel.contains(e.target) && e.target !== btn){
    panel.classList.remove('open');
  }
});

// ══════════════════════════════════════════════
//  LEGAL MODALS
// ══════════════════════════════════════════════
const LEGAL_CONTENT_ALL = {
  he: {
    accessibility:{
      title:'הצהרת נגישות',
      body:`
        <h3>מחויבות לנגישות</h3>
        <p>NSF 3D מאמין שכולם — ללא יוצא מן הכלל — מגיעים לחוויית שימוש נוחה ונגישה באתר.</p>
        <h3>♿ כלי הנגישות המובנה</h3>
        <p>האתר כולל לחצן נגישות קבוע בפינה הימנית התחתונה של המסך, המאפשר:</p>
        <ul>
          <li>📝 <strong>שינוי גודל טקסט</strong> — הגדלה או הקטנה של הגופן</li>
          <li>⬛ <strong>ניגודיות גבוהה</strong> — הגברת הניגוד לנוחות קריאה</li>
          <li>🔗 <strong>הדגשת קישורים</strong> — קו תחתון לכל הקישורים</li>
          <li>⏸ <strong>עצירת אנימציות</strong> — לרגישים לתנועה</li>
          <li>🖱️ <strong>סמן גדול</strong> — להתמצאות נוחה יותר</li>
        </ul>
        <p>כל ההגדרות נשמרות אוטומטית בדפדפן לביקורים הבאים.</p>
        <h3>פעולות נגישות נוספות</h3>
        <ul>
          <li>ניגודיות צבעים נאותה בשני מצבי תצוגה (בהיר / כהה)</li>
          <li>תיאורי alt לכל התמונות המשמעותיות</li>
          <li>מבנה כותרות היררכי (H1, H2, H3)</li>
          <li>ניווט מקלדת לכל הרכיבים המרכזיים באתר (Tab, Enter, Escape)</li>
          <li>תוויות aria לרכיבים אינטראקטיביים</li>
        </ul>
        <h3>מעמד משפטי</h3>
        <div class="highlight">NSF 3D פועל כעוסק פטור, ובהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), חל על העסק פטור מלא מחובת ביצוע התאמות נגישות מקיפות באתר. <strong>יחד עם זאת, ומתוך מחויבות אמיתית לנושא — יישמנו באתר את ההתאמות המפורטות לעיל, מעבר לנדרש מאיתנו על פי חוק.</strong></div>
        <h3>נתקלתם בבעיה בנגישות? נשמח לעזור</h3>
        <p><strong>אחראי נגישות:</strong> סמואל נרודיצקי פינקל | <strong>טלפון:</strong> 055-9144386 | <strong>מייל:</strong> nsf3d.il@gmail.com</p>
        <p style="font-size:13px;color:var(--text2);margin-top:10px">עדכון אחרון: יוני 2026</p>
      `
    },
    privacy:{
      title:'מדיניות פרטיות',
      body:`
        <h3>מהו המידע שאנו אוספים?</h3>
        <p>בטופס יצירת הקשר באתר: שם מלא, מספר טלפון, כתובת מייל (לא חובה), ותוכן הפנייה. מסירת הפרטים היא לבחירתכם ובהסכמתכם, ונדרשת לצורך מענה לפנייתכם — בלעדיה לא נוכל לחזור אליכם.</p>
        <h3>כיצד אנו משתמשים במידע?</h3>
        <ul><li>מענה לפניות, הצעות מחיר ועיבוד הזמנות</li><li>שיפור השירות והאתר</li></ul>
        <h3>שירותי צד שלישי</h3>
        <p>לצורך משלוח הפנייה שלכם אלינו, אנו משתמשים בשירות הדיוור <strong>EmailJS</strong> להעברת תוכן הפנייה לתיבת המייל שלנו. ככל שתאשרו זאת באנר העוגיות, ייתכן שימוש בכלי שיווק/אנליטיקה (כגון Meta Pixel או Google Analytics) למדידת ביצועי האתר. <strong>אנו לא מוכרים, משתפים או מעבירים את פרטיכם לכל גורם אחר, ולכל מטרה אחרת.</strong></p>
        <h3>שמירת מידע</h3>
        <p>אנו שומרים את פרטי הפנייה למשך הזמן הנדרש למתן השירות ולתיעוד עסקי סביר בלבד.</p>
        <h3>עוגיות (Cookies)</h3>
        <p>האתר משתמש בעוגיות הכרחיות לתפעולו, ובעוגיות נוספות (שיווק/אנליטיקה) רק בכפוף להסכמתכם המפורשת באנר העוגיות. ניתן לשנות את ההסכמה בכל עת.</p>
        <h3>זכויותיכם</h3>
        <p>בהתאם לחוק הגנת הפרטיות (ישראל), יש לכם זכות לעיין, לתקן או למחוק את המידע האישי שנמסר לנו. לפניות: <strong>nsf3d.il@gmail.com</strong></p>
        <p style="font-size:13px;color:var(--text2);margin-top:10px">עדכון אחרון: יוני 2026</p>
      `
    },
    terms:{
      title:'תקנון ותנאי שימוש — NSF 3D',
      body:`
        <p style="font-size:12px;color:var(--text2);margin-bottom:16px">עדכון אחרון: יוני 2026 | גרסה 1.3</p>
        <h3>1. כללי ותחולה</h3>
        <p>תקנון זה מסדיר את תנאי ההתקשרות בין <strong>NSF 3D</strong> לבין כל לקוח המבצע הזמנה. ביצוע הזמנה מהווה הסכמה מלאה לתנאי תקנון זה.</p>
        <h3>2. איך עובד תהליך ההזמנה</h3>
        <p>האתר משמש להצגת מידע, קטלוג צבעים וחומרים, ופרויקטים לדוגמה — ההזמנה עצמה אינה מתבצעת באופן אוטומטי באתר. התהליך: גלישה באתר ובחירת מה שמתאים ← פנייה ותיאום בוואטסאפ, טלפון או טופס יצירת קשר ← אישור מחיר מפורט מול הלקוח ← תשלום ← ייצור ומסירה (איסוף עצמי או משלוח). העסקה נכרתת בשלב אישור המחיר בין הצדדים, ולא לפני כן.</p>
        <h3>3. קניין רוחני</h3>
        <p>הלקוח מצהיר כי הוא הבעלים החוקי של כל קובץ שהוא מוסר לייצור. NSF 3D אינה אחראית לגבי זכויות קניין רוחני הגלומות בקבצים.</p>
        <div class="highlight"><strong>⚠️ דגש:</strong> אין להגיש לייצור קבצים של דמויות מוגנות ללא אישור מחזיק הזכויות.</div>
        <h3>4. טיב המוצר</h3>
        <p>סימני שכבות, קווי חיבור ועקבות תמיכות הם חלק אינהרנטי מתהליך ההדפסה ואינם מהווים פגם. תיתכן סטייה מידתית של עד ±0.2 מ"מ.</p>
        <h3>5. ביטולים והחזרים</h3>
        <div class="highlight"><strong>⚠️ בהתאם לסעיף 14ג(ד) לחוק הגנת הצרכן, התשמ"א-1981, הקובע כי זכות הביטול בעסקת מכר מרחוק אינה חלה על טובין שיוצרו במיוחד בעבור הצרכן בעקבות העסקה — מוצרי NSF 3D, המיוצרים בהזמנה אישית ולפי דרישת הלקוח, נכללים בחריג זה, ואינם כפופים לזכות ביטול חד-צדדית.</strong></div>
        <h3>6. טיפול בפגמים ואי-התאמות</h3>
        <p>במקרה שבו המוצר שהתקבל אינו תואם את שהוסכם (לדוגמה: צבע, מימדים או פרטים שונים מהותית מההזמנה) — יש לפנות אלינו בהקדם עם תיאור ותמונה. נבדוק את המקרה ונפעל לתיקון, להדפסה חדשה או להחזר כספי חלקי/מלא, בהתאם לנסיבות ובתיאום מול הלקוח.</p>
        <h3>7. אמצעי תשלום</h3>
        <p>NSF 3D מקבל תשלום ב-<strong>Bit</strong>, <strong>PayBox</strong>, <strong>מזומן</strong> ו<strong>העברה בנקאית</strong>. העסק פועל כעוסק פטור.</p>
        <h3>8. זמני אספקה</h3>
        <p>זמני האספקה (1–10 ימי עסקים, בהתאם לעומס ומורכבות הפרויקט) מדויקים, למעט מקרים חריגים.</p>
        <h3>9. סמכות שיפוט</h3>
        <p>כל מחלוקת תדון בבתי המשפט המוסמכים במחוז הדרום.</p>
      `
    }
  },
  en: {
    accessibility:{
      title:'Accessibility Statement',
      body:`
        <h3>Our commitment to accessibility</h3>
        <p>NSF 3D believes that everyone — without exception — deserves a comfortable, accessible experience on our website.</p>
        <h3>♿ Built-in accessibility toolbar</h3>
        <p>The site includes a fixed accessibility button in the bottom corner of the screen, which lets you:</p>
        <ul>
          <li>📝 <strong>Change text size</strong> — increase or decrease the font size</li>
          <li>⬛ <strong>High contrast</strong> — boost contrast for easier reading</li>
          <li>🔗 <strong>Highlight links</strong> — underline all links</li>
          <li>⏸ <strong>Stop animations</strong> — for motion-sensitive visitors</li>
          <li>🖱️ <strong>Large cursor</strong> — for easier navigation</li>
        </ul>
        <p>All settings are saved automatically in your browser for future visits.</p>
        <h3>Additional accessibility measures</h3>
        <ul>
          <li>Proper color contrast in both light and dark display modes</li>
          <li>Alt text for all meaningful images</li>
          <li>Hierarchical heading structure (H1, H2, H3)</li>
          <li>Keyboard navigation for all key site elements (Tab, Enter, Escape)</li>
          <li>ARIA labels for interactive components</li>
        </ul>
        <h3>Legal status</h3>
        <div class="highlight">NSF 3D operates as an Israeli "exempt dealer" (osek patur), and under Israel's Equal Rights for Persons with Disabilities regulations (service accessibility accommodations), the business is fully exempt from the duty to implement comprehensive website accessibility accommodations. <strong>Nevertheless, out of genuine commitment to this issue, we have implemented the accommodations detailed above, beyond what is legally required of us.</strong></div>
        <h3>Found an accessibility issue? We're happy to help</h3>
        <p><strong>Accessibility contact:</strong> Samuel Naroditski Finkel | <strong>Phone:</strong> 055-9144386 | <strong>Email:</strong> nsf3d.il@gmail.com</p>
        <p style="font-size:13px;color:var(--text2);margin-top:10px">Last updated: June 2026</p>
      `
    },
    privacy:{
      title:'Privacy Policy',
      body:`
        <h3>What information do we collect?</h3>
        <p>Through the contact form on the site: full name, phone number, email address (optional), and the content of your message. Providing these details is your choice and requires your consent, and is needed in order to respond to your inquiry — without it, we cannot get back to you.</p>
        <h3>How do we use this information?</h3>
        <ul><li>Responding to inquiries, quotes, and processing orders</li><li>Improving our service and website</li></ul>
        <h3>Third-party services</h3>
        <p>To deliver your message to us, we use the <strong>EmailJS</strong> mailing service to forward your inquiry to our inbox. If you consent via the cookie banner, we may also use marketing/analytics tools (such as Meta Pixel or Google Analytics) to measure site performance. <strong>We do not sell, share, or transfer your details to any other party, for any other purpose.</strong></p>
        <h3>Data retention</h3>
        <p>We retain your inquiry details only for as long as needed to provide the service and for reasonable business record-keeping.</p>
        <h3>Cookies</h3>
        <p>The site uses cookies that are essential for its operation, and additional cookies (marketing/analytics) only with your explicit consent via the cookie banner. You may change your consent at any time.</p>
        <h3>Your rights</h3>
        <p>Under Israel's Privacy Protection Law, you have the right to review, correct, or delete the personal information you provided to us. For inquiries: <strong>nsf3d.il@gmail.com</strong></p>
        <p style="font-size:13px;color:var(--text2);margin-top:10px">Last updated: June 2026</p>
      `
    },
    terms:{
      title:'Terms of Service — NSF 3D',
      body:`
        <p style="font-size:12px;color:var(--text2);margin-bottom:16px">Last updated: June 2026 | Version 1.3</p>
        <h3>1. General and scope</h3>
        <p>These Terms govern the relationship between <strong>NSF 3D</strong> and any customer placing an order. Placing an order constitutes full agreement to these Terms.</p>
        <h3>2. How the ordering process works</h3>
        <p>The website is used to present information, a catalog of colors and materials, and sample projects — orders themselves are not placed automatically through the site. The process: browse the site and choose what suits you → reach out and coordinate via WhatsApp, phone, or the contact form → confirm a detailed price with the customer → payment → production and delivery (self pickup or shipping). The transaction is formed at the point the price is confirmed between the parties, and not before.</p>
        <h3>3. Intellectual property</h3>
        <p>The customer represents that they are the lawful owner of any file submitted for production. NSF 3D is not responsible for intellectual property rights embedded in submitted files.</p>
        <div class="highlight"><strong>⚠️ Important:</strong> Do not submit files of copyrighted characters for production without the rights holder's permission.</div>
        <h3>4. Product characteristics</h3>
        <p>Layer lines, seam marks, and support marks are an inherent part of the printing process and do not constitute a defect. A dimensional deviation of up to ±0.2mm may occur.</p>
        <h3>5. Cancellations and refunds</h3>
        <div class="highlight"><strong>⚠️ Under Section 14c(d) of Israel's Consumer Protection Law, 5741-1981, which provides that the right of cancellation in a distance sale does not apply to goods specially manufactured for the consumer as a result of the transaction — NSF 3D products, which are custom-made to order per the customer's request, fall under this exception and are not subject to a unilateral right of cancellation.</strong></div>
        <h3>6. Handling defects and discrepancies</h3>
        <p>If the product received does not match what was agreed (for example: color, dimensions, or details that differ materially from the order) — please contact us as soon as possible with a description and photo. We will review the case and act to repair it, reprint it, or issue a partial/full refund, depending on the circumstances and in coordination with the customer.</p>
        <h3>7. Payment methods</h3>
        <p>NSF 3D accepts payment via <strong>Bit</strong>, <strong>PayBox</strong>, <strong>cash</strong>, and <strong>bank transfer</strong>. The business operates as an Israeli exempt dealer (osek patur).</p>
        <h3>8. Delivery times</h3>
        <p>Delivery times (1–10 business days, depending on workload and project complexity) are estimates, except in exceptional cases.</p>
        <h3>9. Jurisdiction</h3>
        <p>Any dispute will be heard in the competent courts of Israel's Southern District.</p>
      `
    }
  },
  ru: {
    accessibility:{
      title:'Заявление о доступности',
      body:`
        <h3>Наша приверженность доступности</h3>
        <p>NSF 3D считает, что каждый — без исключения — заслуживает удобного и доступного взаимодействия с нашим сайтом.</p>
        <h3>♿ Встроенная панель доступности</h3>
        <p>На сайте есть фиксированная кнопка доступности в нижнем углу экрана, которая позволяет:</p>
        <ul>
          <li>📝 <strong>Изменить размер текста</strong> — увеличить или уменьшить шрифт</li>
          <li>⬛ <strong>Высокая контрастность</strong> — усилить контраст для удобства чтения</li>
          <li>🔗 <strong>Выделение ссылок</strong> — подчеркивание всех ссылок</li>
          <li>⏸ <strong>Остановка анимаций</strong> — для чувствительных к движению пользователей</li>
          <li>🖱️ <strong>Крупный курсор</strong> — для более удобной навигации</li>
        </ul>
        <p>Все настройки автоматически сохраняются в браузере для последующих посещений.</p>
        <h3>Дополнительные меры по доступности</h3>
        <ul>
          <li>Надлежащая цветовая контрастность в светлом и тёмном режимах</li>
          <li>Alt-описания для всех значимых изображений</li>
          <li>Иерархическая структура заголовков (H1, H2, H3)</li>
          <li>Навигация с клавиатуры для всех ключевых элементов сайта (Tab, Enter, Escape)</li>
          <li>ARIA-метки для интерактивных элементов</li>
        </ul>
        <h3>Правовой статус</h3>
        <div class="highlight">NSF 3D работает как индивидуальный предприниматель, освобождённый от НДС (осек патур) в Израиле, и в соответствии с израильскими нормами о равных правах для людей с инвалидностью (доступность услуг) полностью освобождён от обязанности реализации комплексных мер по обеспечению доступности сайта. <strong>Тем не менее, из искреннего желания заботиться об этом вопросе, мы реализовали на сайте описанные выше меры — сверх того, что требуется от нас по закону.</strong></div>
        <h3>Столкнулись с проблемой доступности? Будем рады помочь</h3>
        <p><strong>Ответственный за доступность:</strong> Самуэль Народицкий Финкель | <strong>Телефон:</strong> 055-9144386 | <strong>Email:</strong> nsf3d.il@gmail.com</p>
        <p style="font-size:13px;color:var(--text2);margin-top:10px">Последнее обновление: июнь 2026</p>
      `
    },
    privacy:{
      title:'Политика конфиденциальности',
      body:`
        <h3>Какую информацию мы собираем?</h3>
        <p>Через контактную форму на сайте: полное имя, номер телефона, адрес электронной почты (необязательно) и содержание обращения. Предоставление данных — ваш выбор с вашего согласия, и необходимо для ответа на ваше обращение — без них мы не сможем с вами связаться.</p>
        <h3>Как мы используем эту информацию?</h3>
        <ul><li>Ответы на обращения, расчёт стоимости и обработка заказов</li><li>Улучшение сервиса и сайта</li></ul>
        <h3>Сторонние сервисы</h3>
        <p>Для доставки вашего сообщения нам мы используем почтовый сервис <strong>EmailJS</strong> для пересылки содержания обращения на наш почтовый ящик. При вашем согласии через баннер cookie мы также можем использовать инструменты маркетинга/аналитики (например, Meta Pixel или Google Analytics) для оценки эффективности сайта. <strong>Мы не продаём, не передаём и не раскрываем ваши данные третьим лицам ни для каких иных целей.</strong></p>
        <h3>Хранение данных</h3>
        <p>Мы храним данные вашего обращения только в течение времени, необходимого для оказания услуги и разумного делового учёта.</p>
        <h3>Файлы cookie</h3>
        <p>Сайт использует файлы cookie, необходимые для его работы, а также дополнительные cookie (маркетинг/аналитика) только с вашего явного согласия через баннер cookie. Вы можете изменить своё согласие в любое время.</p>
        <h3>Ваши права</h3>
        <p>В соответствии с израильским Законом о защите частной жизни, вы имеете право просматривать, исправлять или удалять предоставленные нам персональные данные. По вопросам: <strong>nsf3d.il@gmail.com</strong></p>
        <p style="font-size:13px;color:var(--text2);margin-top:10px">Последнее обновление: июнь 2026</p>
      `
    },
    terms:{
      title:'Условия использования — NSF 3D',
      body:`
        <p style="font-size:12px;color:var(--text2);margin-bottom:16px">Последнее обновление: июнь 2026 | Версия 1.3</p>
        <h3>1. Общие положения и сфера действия</h3>
        <p>Настоящие условия регулируют отношения между <strong>NSF 3D</strong> и любым клиентом, оформляющим заказ. Оформление заказа означает полное согласие с условиями настоящего документа.</p>
        <h3>2. Как проходит процесс заказа</h3>
        <p>Сайт используется для представления информации, каталога цветов и материалов, а также примеров проектов — сам заказ не оформляется автоматически через сайт. Процесс: просмотр сайта и выбор подходящего варианта → обращение и согласование через WhatsApp, телефон или контактную форму → подтверждение точной цены с клиентом → оплата → изготовление и передача (самовывоз или доставка). Сделка считается заключённой на этапе подтверждения цены между сторонами, а не ранее.</p>
        <h3>3. Интеллектуальная собственность</h3>
        <p>Клиент подтверждает, что является законным владельцем любого файла, переданного для изготовления. NSF 3D не несёт ответственности за права интеллектуальной собственности, заложенные в переданных файлах.</p>
        <div class="highlight"><strong>⚠️ Важно:</strong> запрещается передавать для изготовления файлы защищённых авторским правом персонажей без разрешения правообладателя.</div>
        <h3>4. Особенности изделия</h3>
        <p>Линии слоёв, следы швов и следы поддержек являются неотъемлемой частью процесса печати и не считаются браком. Возможно отклонение размеров до ±0,2 мм.</p>
        <h3>5. Отмена заказа и возврат средств</h3>
        <div class="highlight"><strong>⚠️ В соответствии со статьёй 14в(г) израильского Закона о защите прав потребителей 5741-1981, согласно которой право на отмену дистанционной сделки не распространяется на товары, изготовленные специально для потребителя в результате сделки — изделия NSF 3D, изготавливаемые на заказ по индивидуальному запросу клиента, подпадают под это исключение и не подлежат одностороннему праву отмены.</strong></div>
        <h3>6. Работа с дефектами и несоответствиями</h3>
        <p>Если полученное изделие не соответствует согласованному (например: цвет, размеры или детали существенно отличаются от заказа) — свяжитесь с нами как можно скорее, приложив описание и фото. Мы рассмотрим случай и предпримем меры: исправление, повторную печать или частичный/полный возврат средств — в зависимости от обстоятельств и по согласованию с клиентом.</p>
        <h3>7. Способы оплаты</h3>
        <p>NSF 3D принимает оплату через <strong>Bit</strong>, <strong>PayBox</strong>, <strong>наличными</strong> и <strong>банковским переводом</strong>. Бизнес работает в статусе «осек патур» (индивидуальный предприниматель, освобождённый от НДС).</p>
        <h3>8. Сроки изготовления</h3>
        <p>Сроки изготовления (1–10 рабочих дней, в зависимости от загруженности и сложности проекта) являются ориентировочными, за исключением особых случаев.</p>
        <h3>9. Подсудность</h3>
        <p>Любой спор будет рассматриваться в компетентных судах Южного округа Израиля.</p>
      `
    }
  }
};
const LEGAL_CONTENT = LEGAL_CONTENT_ALL[LANG] || LEGAL_CONTENT_ALL.he;

function openLegal(type){
  const c=LEGAL_CONTENT[type]; if(!c) return;
  document.getElementById('legalTitle').textContent=c.title;
  document.getElementById('legalBody').innerHTML=c.body;
  document.getElementById('legalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeLegal(e){ if(e.target===document.getElementById('legalOverlay')) closeLegalDirect(); }
function closeLegalDirect(){ document.getElementById('legalOverlay').classList.remove('open'); document.body.style.overflow=''; }
