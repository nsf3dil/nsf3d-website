/* ══════════════════════════════════════════════
   NSF 3D — app.js
   ══════════════════════════════════════════════
   הקובץ הזה מרכז את כל ה-JS של האתר. שינויים בשלב הזה:
   1. SITE_CONFIG — מקום אחד להדליק/לכבות סקשנים ופיצ'רים
   2. אבטחה: honeypot + throttle בטופס, caching לקריאות ל-Workers
   3. escapeHTML — מניעת XSS בתוכן שמגיע מ-Notion/Workers
   4. רינדור לסקשנים החדשים: חנות (ציוד מיובא) ומאמרים
   ══════════════════════════════════════════════ */

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
const MATERIALS = [
  { name:"PLA",        load:1, impact:1, heat:1, uv:1, chemical:2, suits:"פסלונים · דגמי נוי · מתנות" },
  { name:"PETG",       load:2, impact:3, heat:2, uv:2, chemical:2, suits:"כלי מטבח · אריזות · חלקים טכניים" },
  { name:"TPU",        load:1, impact:3, heat:2, uv:2, chemical:2, suits:"סוליות · אטמים · מארזי הגנה" },
  { name:"ASA",        load:2, impact:3, heat:2, uv:3, chemical:2, suits:"שילוט חוץ · רהיטי גינה · תושבות רכב" },
  { name:"ABS",        load:2, impact:3, heat:2, uv:1, chemical:2, suits:"צעצועים · חלקי רכב · כיסויים" },
  { name:"PA (Nylon)", load:2, impact:3, heat:2, uv:1, chemical:3, suits:"גלגלי שיניים · צירים · חלקי מכונה" },
  { name:"PC",         load:3, impact:3, heat:3, uv:2, chemical:2, suits:"מגנים · תושבות עומס · חלקים שקופים" },
  { name:"PP",         load:1, impact:3, heat:2, uv:1, chemical:3, suits:"מכסים · ציר חי · קופסאות" },
  { name:"PPA-CF",     load:3, impact:2, heat:3, uv:2, chemical:2, suits:"חלקים הנדסיים בעומס וחום קיצוניים" },
  { name:"PPS-CF",     load:3, impact:2, heat:3, uv:3, chemical:3, suits:"תעופה · רכב · עומס מבני בסביבה כימית" },
];

// ┌──────────────────────────────────────────────────────────────┐
// │  🧫 RESIN_MATERIALS — טבלת חומרי רזין (טיוטה ראשונית!)        │
// │  הסקשן כבוי (resinMaterials.enabled=false) עד שתאשר/תערוך.   │
// └──────────────────────────────────────────────────────────────┘
const RESIN_MATERIALS = [
  { name:"Standard Resin", meaning:"שרף סטנדרטי", suits:"דמויות · מיניאטורות · פרטים זעירים", strength:"mid",
    heat:{level:"mid",temp:"~55°C"}, moisture:"mid", uv:"bad", chemical:"mid", flex:"bad", foodSafe:"bad", difficulty:"good", price:1 },
  { name:"Tough / Durable Resin", meaning:"שרף קשיח ועמיד", suits:"חלקים פונקציונליים · פרוטוטייפים", strength:"good",
    heat:{level:"mid",temp:"~60°C"}, moisture:"mid", uv:"bad", chemical:"mid", flex:"mid", foodSafe:"bad", difficulty:"mid", price:2 },
  { name:"Flexible Resin", meaning:"שרף גמיש", suits:"אטמים · מודלים גמישים", strength:"mid",
    heat:{level:"bad",temp:"~45°C"}, moisture:"mid", uv:"bad", chemical:"bad", flex:"good", foodSafe:"bad", difficulty:"mid", price:2 },
  { name:"High-Temp Resin", meaning:"שרף עמיד חום גבוה", suits:"תבניות יציקה · חלקי חום", strength:"good",
    heat:{level:"good",temp:"~120°C"}, moisture:"mid", uv:"bad", chemical:"good", flex:"bad", foodSafe:"bad", difficulty:"bad", price:3 },
  { name:"Water-Washable Resin", meaning:"שרף נשטף במים", suits:"עבודה נוחה · דמויות בסיסיות", strength:"mid",
    heat:{level:"bad",temp:"~50°C"}, moisture:"bad", uv:"bad", chemical:"bad", flex:"bad", foodSafe:"bad", difficulty:"good", price:2 },
];

const WORKER_URL          = "https://nsf3d-colors.nsf3d-il.workers.dev/";
const PROJECTS_WORKER_URL = "https://nsf3d-projects.nsf3d-il.workers.dev/";
const TURNSTILE_VERIFY_URL = "https://nsf3d-verify-turnstile.nsf3d-il.workers.dev/";

const WA_NUMBER    = "972559144386";
const WA_MSG       = encodeURIComponent("היי NSF 3D! 👋 אשמח לשמוע פרטים 😊");
const EMAIL_ADDR   = "nsf3d.il@gmail.com";
const EMAIL_SUBJECT= encodeURIComponent("פנייה מהאתר — NSF 3D");
const EMAIL_BODY   = encodeURIComponent("היי NSF 3D,\n\nפונה אליכם מהאתר.\n\n");
const SITE_URL     = "https://nsf3d.co.il/";
function getDefaultShow(){ return window.innerWidth <= 768 ? 4 : 6; }
const EMAILJS_SERVICE  = "nsf3d_gmail";
const EMAILJS_TEMPLATE = "template_auajv0o";
const EMAILJS_KEY      = "0zsMlXrQhjmsDRUI9";
const PROJECTS_DEFAULT_SHOW = 3;

// ══════════════════════════════════════════════
//  🔔 SITE ANNOUNCEMENT
// ══════════════════════════════════════════════
const SITE_ANNOUNCEMENT = {
  enabled: true,
  id: "site-construction-v1",
  persistence: "always",
  delay: 500,
  icon: "🚧",
  title: "האתר והעסק כרגע בשלבי הקמה!",
  text: `כלל השירותים לא יהיו זמינים במהלך החודשים הקרובים, למעט פרויקטים חריגים שיכולים להתקבל לפי בקשה, לכל נושא אחר ניתן לדבר איתנו בווטסאפ.`,
  buttons: [
    { type:"wa", label:"📱 דברו איתנו בוואטסאפ", href:"__WA__" },
    { type:"secondary", label:"אוקיי, אמשיך לגלוש", action:"close" }
  ],
  footerNote: "📍 באר שבע · משלוח לכל הארץ · מענה מהיר"
};

// ══════════════════════════════════════════════
//  SOCIALS
// ══════════════════════════════════════════════
const SOCIALS = [
  { url:"https://www.facebook.com/profile.php?id=61586093829404", name:"פייסבוק", handle:"NSF.3D", color:"#1877F2",
    svg:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>` },
  { url:"https://www.instagram.com/nsf.3d/", name:"אינסטגרם", handle:"@nsf.3d", color:"#E1306C",
    svg:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>` },
  { url:"https://www.tiktok.com/@nsf.3d", name:"טיקטוק", handle:"@nsf.3d", color:"#000000",
    svg:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.14 8.14 0 004.77 1.52V6.76a4.85 4.85 0 01-1-.07z"/></svg>` },
  { url:"https://www.youtube.com/@NSFchannel", name:"יוטיוב", handle:"NSFchannel", color:"#FF0000",
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

// קאש קצר-מועד ל-fetch מה-Workers, כדי לא להפציץ אותם בכל רענון/חזרה לטאב.
// TTL של 5 דקות מספיק כדי לחתוך עומס בלי לפגוע בעדכניות בפועל.
const FETCH_CACHE_TTL_MS = 5 * 60 * 1000;
async function cachedFetchJSON(url, cacheKey){
  try{
    const cached = sessionStorage.getItem(cacheKey);
    if(cached){
      const { ts, data } = JSON.parse(cached);
      if(Date.now() - ts < FETCH_CACHE_TTL_MS) return data;
    }
  }catch(e){ /* cache corrupted — ignore, fetch fresh */ }

  const res  = await fetch(url);
  const data = await res.json();
  try{ sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data })); }catch(e){ /* storage full — ignore */ }
  return data;
}

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
  document.getElementById('darkLabel').textContent=d?'מצב בהיר':'מצב כהה';
}

// ══════════════════════════════════════════════
//  DOM READY
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  if(typeof emailjs !== 'undefined'){ emailjs.init(EMAILJS_KEY); }
  else { console.warn('[NSF3D] EmailJS not loaded!'); }

  applySiteConfig();
  initActiveSection();

  if(document.body.classList.contains('dark')){
    document.getElementById('darkIcon').textContent='☀️';
    document.getElementById('darkLabel').textContent='מצב בהיר';
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
    const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
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
    dateEl.innerHTML = `<span class="live-dot" title="מלאי חי"></span> נכון בתאריך: ${d}/${m}/${y} (יום ${days[now.getDay()]})`;
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
    const data = await cachedFetchJSON(WORKER_URL, 'nsf-cache-colors');
    allColors = (data.colors||[]).filter(c=>c.name&&c.name!=='ללא שם');
    filterColors();
  }catch(e){
    document.getElementById('colorsGrid').innerHTML='<div class="loading" style="grid-column:1/-1">⚠️ שגיאה בטעינת הצבעים. נסו לרענן.</div>';
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
    const label = showingAll ? 'הצג פחות ↑' : `הצג את כל ${total} הצבעים ↓`;
    rowBottom.style.display = 'block';
    btnBottom.textContent   = label;
    rowTop.style.display  = showingAll ? 'block' : 'none';
    btnTop.textContent    = showingAll ? 'הצג פחות ↑' : label;
  } else {
    rowBottom.style.display = 'none';
    rowTop.style.display    = 'none';
  }
}

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
  if(!list.length){ grid.innerHTML='<div class="loading" style="grid-column:1/-1">לא נמצאו צבעים</div>'; return; }
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
          <span class="color-sku">מק"ט: ${safeSku}</span>
        </div>
        <div class="color-meta" style="margin-top:4px">
          ${isGlow?'<span class="tag-glow">✨ זוהר בחושך</span>':''}
          ${c.special?'<span class="tag-special">💎 מיוחד</span>':''}
          ${inStock?'<span class="tag-instock">✓ במלאי</span>':'<span class="tag-outstock">✗ אזל</span>'}
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
    const data  = await cachedFetchJSON(PROJECTS_WORKER_URL, 'nsf-cache-projects');
    allProjects = data.projects || [];
    renderProjects(allProjects.slice(0, PROJECTS_DEFAULT_SHOW));
    updateProjectsShowMoreButtons(allProjects.length > PROJECTS_DEFAULT_SHOW);
  }catch(e){
    document.getElementById('projectsGrid').innerHTML =
      `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text2)">⚠️ שגיאה בטעינת הפרויקטים. <a href="#contact" style="color:var(--blue-mid);font-weight:700">צרו קשר ישירות</a></div>`;
  }
}

function renderProjects(list){
  const grid = document.getElementById('projectsGrid');
  if(!list.length){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text2)">
      <div style="font-size:40px;margin-bottom:12px">🖨️</div>
      <div style="font-size:16px;font-weight:700">פרויקטים בדרך — בקרוב!</div>
      <div style="font-size:14px;margin-top:6px">בינתיים <a href="#contact" style="color:var(--blue-mid);font-weight:700">שלחו לנו הודעה</a> ונראה מה נוכל לעשות יחד</div>
    </div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const safeName = escapeHTML(p.name);
    const safeDesc  = p.description ? escapeHTML(p.description) : '';
    const safeCat   = p.category ? escapeHTML(p.category) : '';
    const safeImg   = escapeAttr(p.image || '');

    const defaultMsg = encodeURIComponent(`היי NSF 3D! 👋\nראיתי את הפרויקט "${p.name}" באתר ואני רוצה משהו דומה.\nאשמח לשמוע פרטים ומחיר 😊`);
    const waMsg = p.waMsg ? encodeURIComponent(p.waMsg) : defaultMsg;

    const imgHtml = p.image
      ? `<img src="${safeImg}" alt="${safeName}" loading="lazy" decoding="async" style="cursor:zoom-in" onclick="event.stopPropagation();openLightbox(this.src)" onerror="this.parentElement.innerHTML='<div class=project-img-placeholder>🖨️</div>'">`
      : `<div class="project-img-placeholder">🖨️</div>`;

    const featuredBadge = p.featured ? `<div class="project-featured-badge">⭐ מומלץ</div>` : '';
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
             aria-label="הזמינו פרויקט דומה ל-${safeName} בוואטסאפ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            הזמינו כזה ←
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
    const label = projectsShowingAll ? 'הצג פחות ↑' : 'הצג עוד פרויקטים ↓';
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
  const collapseLabel = 'הצג פחות ↑';
  const expandLabel   = 'לצפייה בכל החומרים ↓';
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
      <div style="font-size:16px;font-weight:700">המוצרים בדרך — בקרוב בחנות</div>
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
    const msg = encodeURIComponent(`היי NSF 3D! 👋\nמעוניין במוצר: ${p.name}\nאשמח לפרטים ולתיאום רכישה 😊`);
    return `
      <div class="shop-card">
        <div class="shop-img-wrap">
          ${imgHtml}
          <span class="shop-stock-badge ${inStock?'in':'out'}">${inStock?'✓ במלאי':'✗ אזל'}</span>
        </div>
        <div class="shop-body">
          <div class="shop-name">${safeName}</div>
          ${safeDesc ? `<div class="shop-desc">${safeDesc}</div>` : ''}
          <div class="shop-price-row"><span class="shop-price">${p.price ? p.price + ' ₪' : 'לפי בקשה'}</span></div>
          <a class="shop-btn" href="https://wa.me/${WA_NUMBER}?text=${msg}" target="_blank" rel="noopener noreferrer">📱 פרטים ורכישה</a>
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
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text2)">מאמרים ראשונים בדרך 📝</div>`;
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
          <span class="article-readmore">קראו עוד ←</span>
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
                <span class="mat-corner-top">עמידות ל-</span>
                <span class="mat-corner-bottom">חומר</span>
              </div>
            </th>
            <th>נשיאת משקל<br>קבוע</th>
            <th>מכות<br>ונפילות</th>
            <th>חום</th>
            <th>קרינת שמש<br>(UV)</th>
            <th>כימית</th>
            <th>למה מתאים</th>
          </tr>
        </thead>
        ${tbodyHTML}
      </table>
    </div>
    <div class="materials-legend">
      ${matDots(3)} מעולה &nbsp;&nbsp;
      ${matDots(2)} בינוני &nbsp;&nbsp;
      ${matDots(1)} חלש
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
    document.getElementById('modalTop').innerHTML = `<img class="modal-img" src="${escapeAttr(c.image)}" alt="${safeName}" onclick="openLightbox('${safeUrl.replace(/'/g,"\\'")}')" title="לחצו להגדלה">`;
  } else {
    document.getElementById('modalTop').innerHTML = `<div class="modal-swatch" style="background:${hex||'#9ab4c8'}"></div>`;
  }
  document.getElementById('modalName').textContent = c.name;
  const inStock = c.inStock === true;
  const rows = [
    ['מק"ט', escapeHTML(c.sku||'—')],
    ['מלאי', inStock ? '✓ במלאי' : '✗ אזל'],
  ];
  if(c.notes) rows.push(['הערות', escapeHTML(c.notes)]);
  document.getElementById('modalRows').innerHTML = rows.map(([l,v])=>
    `<div class="modal-row"><span class="modal-row-label">${l}</span><span class="modal-row-val">${v}</span></div>`
  ).join('');
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function orderFromModal(){
  if(!currentModalColor) return;
  const c = currentModalColor;
  const msg = encodeURIComponent(`היי NSF 3D! 👋\nאני מעוניין בצבע: ${c.name} (מק"ט: ${c.sku})\n\nאשמח לשמוע פרטים 😊`);
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
    errEl.textContent = '⚠️ נשלחה פנייה לפני רגע — נא להמתין דקה לפני שליחה נוספת.';
    errEl.style.display='block';
    setTimeout(()=>{ errEl.style.display='none'; errEl.textContent='⚠️ שגיאה בשליחה. נסו שוב או פנו ישירות בוואטסאפ.'; }, 5000);
    return;
  }

  const name    = document.getElementById('fname').value.trim();
  const phone   = document.getElementById('fphone').value.trim();
  const email   = document.getElementById('femail').value.trim();
  const subject = document.getElementById('fsubject').value;
  const message = document.getElementById('fmessage').value.trim();
  const consent = document.getElementById('fconsent');
  if(!name || !phone){ alert('נא למלא שם וטלפון'); return; }
  if(consent && !consent.checked){ alert('יש לאשר את מדיניות הפרטיות לפני שליחת הפנייה'); return; }

  // ── 3. Turnstile — אימות אנושי לפני שליחה בפועל ──
  const turnstileResponse = typeof turnstile !== 'undefined' ? turnstile.getResponse() : '';
  if(!turnstileResponse){
    const errEl0 = document.getElementById('formError');
    errEl0.textContent = '⚠️ נא לאשר שאתם לא רובוט (סמן/י את תיבת האימות) ולנסות שוב.';
    errEl0.style.display='block';
    setTimeout(()=>{ errEl0.style.display='none'; errEl0.textContent='⚠️ שגיאה בשליחה. נסו שוב או פנו ישירות בוואטסאפ.'; }, 5000);
    return;
  }

  const btn=document.getElementById('submitBtn'), success=document.getElementById('formSuccess'), errEl=document.getElementById('formError');
  btn.disabled=true; btn.textContent='⏳ שולח...';
  success.style.display='none'; errEl.style.display='none';
  try{
    // ── אימות הטוקן מול ה-Worker (בדיקה אמיתית בצד שרת, לא ניתנת לעקיפה מהקונסול) ──
    const verifyRes  = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: turnstileResponse })
    });
    const verifyData = await verifyRes.json();
    if(!verifyData.success){
      throw new Error('turnstile_verification_failed');
    }

    await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, { from_name:name, from_phone:phone, from_email:email, subject, message });
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
  btn.disabled=false; btn.textContent='✉️ שלח פניה →';
}

// ══════════════════════════════════════════════
//  MOBILE MENU
// ══════════════════════════════════════════════
function toggleMenu(){ document.getElementById('mobileMenu').classList.toggle('open'); }
function closeMenu(){ document.getElementById('mobileMenu').classList.remove('open'); }

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
const LEGAL_CONTENT = {
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
};

function openLegal(type){
  const c=LEGAL_CONTENT[type]; if(!c) return;
  document.getElementById('legalTitle').textContent=c.title;
  document.getElementById('legalBody').innerHTML=c.body;
  document.getElementById('legalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeLegal(e){ if(e.target===document.getElementById('legalOverlay')) closeLegalDirect(); }
function closeLegalDirect(){ document.getElementById('legalOverlay').classList.remove('open'); document.body.style.overflow=''; }
