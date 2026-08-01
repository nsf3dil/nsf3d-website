// ══════════════════════════════════════════════════
//  NSF 3D — sync-colors.js
//  מושך את קטלוג הצבעים מ-Notion, מוריד את התמונות בפועל
//  לריפו (כדי לפתור פקיעת קישורי S3 של Notion), ושומר
//  colors.json סטטי בתיקיית data/.
// ══════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import crypto from "crypto";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID  = process.env.COLORS_DB_ID;

if (!NOTION_TOKEN || !DATABASE_ID) {
  console.error("❌ חסרים NOTION_TOKEN או COLORS_DB_ID בסביבת ההרצה");
  process.exit(1);
}

const IMAGES_DIR = path.join(process.cwd(), "images", "colors");
const OUTPUT_FILE = path.join(process.cwd(), "data", "colors.json");

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
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
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

// מוריד תמונה מ-URL חיצוני (Notion S3) ושומר אותה מקומית עם שם קובץ יציב (hash של ה-page id)
async function downloadImage(url, pageId) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = guessExtension(res.headers.get("content-type"), url);
    const filename = `${pageId}${ext}`;
    const filepath = path.join(IMAGES_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    // ⚠️ נתיב מוחלט (מתחיל ב-/) בכוונה — הדף נטען גם מ-/en/ ו-/ru/,
    // ונתיב יחסי כמו "images/colors/..." ייפתר שם ל-/en/images/colors/...
    // שלא קיים. נתיב מוחלט תמיד מצביע לשורש האתר בלי קשר לתת-תיקייה.
    return `/images/colors/${filename}`;
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

function isHex(h) { return /^#[0-9A-Fa-f]{6}$/.test(h || ""); }

async function main() {
  console.log("📥 שולף נתונים ממסד הצבעים ב-Notion...");
  const pages = await fetchAllPages();
  console.log(`✅ נמצאו ${pages.length} רשומות`);

  const colors = [];

  for (const page of pages) {
    const p = page.properties;

    const visible = p["מוצג באתר"]?.checkbox;
    if (visible === false) continue;

    const titleProp = Object.values(p).find(v => v.type === "title");
    const name = (titleProp?.title ?? []).map(t => t.plain_text).join('') || "ללא שם";
    if (name === "ללא שם") continue;

    const hex = p["Color Code"]?.rich_text?.[0]?.plain_text ?? "#888888";

    const materialTags = (p["סוג חומר"]?.multi_select ?? []).map(t => t.name);
    const knownMaterials = ["PLA", "PETG", "TPU", "ASA", "ABS", "Silk", "PLA Silk", "PETG-CF"];
    const material = materialTags.find(t => knownMaterials.includes(t)) ?? materialTags[0] ?? "PLA";
    const finishes = materialTags.filter(t => t !== material && t !== "במלאי");
    const inStock = materialTags.includes("במלאי");

    const sku = p["מק\"ט"]?.formula?.string
      ?? p["מקט"]?.formula?.string
      ?? p["מק\"ט"]?.rich_text?.[0]?.plain_text
      ?? "";

    const notes = p["הערות"]?.rich_text?.[0]?.plain_text
      ?? p["הערות / תיאור"]?.rich_text?.[0]?.plain_text
      ?? "";

    let remoteImage = null;
    if (page.cover?.type === "external") remoteImage = page.cover.external.url;
    if (page.cover?.type === "file")     remoteImage = page.cover.file.url;

    let localImage = null;
    if (remoteImage) {
      localImage = await downloadImage(remoteImage, page.id);
    }

    const order = p["סדר"]?.number ?? 999;
    const imgPos = p["מיקום תמונה"]?.number ?? null;
    const special = p["מיוחד"]?.checkbox ?? false;

    colors.push({
      name, hex, material, finishes, sku, notes,
      image: localImage, // ← נתיב מקומי בריפו, לא קישור Notion שפג תוקף
      inStock, order, imgPos, special,
    });
  }

  colors.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name, 'he');
  });

  const output = {
    colors,
    _generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`✅ נכתב ${OUTPUT_FILE} עם ${colors.length} צבעים`);
}

main().catch(err => {
  console.error("❌ שגיאה:", err);
  process.exit(1);
});
