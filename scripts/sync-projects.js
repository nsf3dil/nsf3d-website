// ══════════════════════════════════════════════════
//  NSF 3D — sync-projects.js
//  מושך את הפרויקטים מ-Notion, מוריד את התמונות בפועל
//  לריפו, ושומר projects.json סטטי בתיקיית data/.
// ══════════════════════════════════════════════════

import fs from "fs";
import path from "path";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID  = process.env.PROJECTS_DB_ID;

if (!NOTION_TOKEN || !DATABASE_ID) {
  console.error("❌ חסרים NOTION_TOKEN או PROJECTS_DB_ID בסביבת ההרצה");
  process.exit(1);
}

const IMAGES_DIR = path.join(process.cwd(), "images", "projects");
const OUTPUT_FILE = path.join(process.cwd(), "data", "projects.json");

fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

async function fetchAllPages() {
  let results = [];
  let cursor = undefined;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
        filter: { property: "מפורסם", checkbox: { equals: true } },
      }),
    });
    if (!res.ok) {
      throw new Error(`Notion API error: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    results = results.concat(data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

// מחזיר את הכתובת של התמונה הראשונה בגוף העמוד ב-Notion (אם יש)
async function fetchFirstBodyImage(pageId) {
  let cursor = undefined;
  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);
    const res = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${NOTION_TOKEN}`,
        "Notion-Version": "2022-06-28",
      },
    });
    if (!res.ok) {
      console.warn(`⚠️  לא הצלחתי לקרוא את גוף העמוד ${pageId}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    const img = data.results.find(b => b.type === "image");
    if (img) {
      return img.image.type === "external" ? img.image.external.url : img.image.file?.url ?? null;
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return null;
}

async function downloadImage(url, pageId) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = guessExtension(res.headers.get("content-type"), url);
    const filename = `${pageId}${ext}`;
    const filepath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    // ⚠️ נתיב מוחלט (מתחיל ב-/) — ראו הערה מקבילה ב-sync-colors.js
    return `/images/projects/${filename}`;
  } catch (e) {
    console.warn(`⚠️  נכשלה הורדת תמונה עבור ${pageId}:`, e.message);
    return null;
  }
}

function guessExtension(contentType, url) {
  if (contentType) {
    if (contentType.includes("png")) return ".png";
    if (contentType.includes("webp")) return ".webp";
    if (contentType.includes("gif")) return ".gif";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  }
  const m = url.match(/\.(png|jpe?g|webp|gif)(\?|$)/i);
  if (m) return "." + m[1].toLowerCase().replace("jpeg", "jpg");
  return ".jpg";
}

async function main() {
  console.log("📥 שולף נתונים ממסד הפרויקטים ב-Notion...");
  const pages = await fetchAllPages();
  console.log(`✅ נמצאו ${pages.length} רשומות`);

  const projects = [];

  for (const page of pages) {
    const p = page.properties;

    const titleProp = Object.values(p).find(v => v.type === "title");
    const name = (titleProp?.title ?? []).map(t => t.plain_text).join('') || "פרויקט";

    const category = p["קטגוריה"]?.select?.name ?? "";

    const description = p["תיאור"]?.rich_text?.[0]?.plain_text
      ?? p["תיאור קצר"]?.rich_text?.[0]?.plain_text
      ?? "";

    const waMsg = p["הודעת וואטסאפ"]?.rich_text?.[0]?.plain_text ?? "";
    const featured = p["מומלץ"]?.checkbox ?? false;
    const order = p["סדר"]?.number ?? 999;

    // סדר עדיפויות לתמונה: 1) התמונה הראשונה בגוף העמוד  2) שדה "תמונה"  3) תמונת הכיסוי (cover)
    let remoteImage = await fetchFirstBodyImage(page.id);
    if (!remoteImage && p["תמונה"]?.files?.[0]) {
      const f = p["תמונה"].files[0];
      remoteImage = f.type === "external" ? f.external.url : f.file?.url ?? null;
    }
    if (!remoteImage && page.cover?.type === "external") remoteImage = page.cover.external.url;
    if (!remoteImage && page.cover?.type === "file")     remoteImage = page.cover.file.url;

    let localImage = null;
    if (remoteImage) {
      localImage = await downloadImage(remoteImage, page.id);
    }

    projects.push({ name, category, description, waMsg, featured, order, image: localImage });
  }

  // הסדר באתר נקבע אך ורק לפי עמודת "סדר" ב-Notion (תג "מומלץ" ⭐ ממשיך להופיע על הכרטיס)
  projects.sort((a, b) => a.order - b.order);

  const output = {
    projects,
    _generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`✅ נכתב ${OUTPUT_FILE} עם ${projects.length} פרויקטים`);
}

main().catch(err => {
  console.error("❌ שגיאה:", err);
  process.exit(1);
});
