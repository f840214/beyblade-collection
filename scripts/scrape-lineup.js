#!/usr/bin/env node
// Scrape Takara Tomy Beyblade X lineup page
// Detects new products, fetches metadata & images
// Run: node scripts/scrape-lineup.js

const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE = "https://beyblade.takaratomy.co.jp/beyblade-x/lineup/";
const PROD_BEYS = path.join(__dirname, "..", "data", "prod-beys.json");
const PRODUCTS_DIR = path.join(__dirname, "..", "products");
const OUTPUT = path.join(__dirname, "..", "data", "lineup-scraped.json");

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve, reject);
      }
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function fetchBinary(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBinary(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// Parse lineup listing page
function parseListingPage(html) {
  const products = [];
  // Each product: <li class="mix starter atack seriesbx bx" data-release-date="1"> <a href="bx01.html">
  const re = /<li\s+class="mix\s+([^"]+)"\s+data-release-date="(\d+)"[^>]*>\s*<a\s+href="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const classes = m[1];
    const order = parseInt(m[2]);
    const href = m[3];

    // Extract product code from href
    // Standard: bx01.html -> BX-01, cx18.html -> CX-18
    // Special: bx00-es.html -> BX-00-ES, cx00-eva.html -> CX-00-EVA
    const hrefMatch = href.match(/^([a-z]+)(\d+)(?:-([a-z0-9]+))?\.html$/);
    if (!hrefMatch) continue;

    const prefix = hrefMatch[1].toUpperCase();
    const num = hrefMatch[2];
    const suffix = hrefMatch[3] ? `-${hrefMatch[3].toUpperCase()}` : "";
    const code = `${prefix}-${num}${suffix}`;

    // Extract type from classes
    let type = "other";
    if (classes.includes("starter")) type = "starter";
    else if (classes.includes("randombooster")) type = "random_booster";
    else if (classes.includes("booster")) type = "booster";
    else if (classes.includes("set")) type = "set";
    else if (classes.includes("tool")) type = "tool";

    // Extract attribute
    let attr = null;
    if (classes.includes("atack")) attr = "att";
    else if (classes.includes("defence")) attr = "def";
    else if (classes.includes("stamina")) attr = "sta";
    else if (classes.includes("balance")) attr = "bal";

    // Extract series
    let series = "BX";
    if (classes.includes("seriescx")) series = "CX";
    else if (classes.includes("seriesux")) series = "UX";

    products.push({ code, href, order, type, attr, series, classes });
  }
  return products;
}

// Parse individual product detail page
async function parseDetailPage(href) {
  const url = BASE + href;
  try {
    const html = await fetch(url);
    const info = {};

    // Name: <p class="name">BX-01 <span>ドランソード3-60F</span></p>
    const nameMatch = html.match(/<p\s+class="name">[^<]*<span>([^<]+)<\/span>/);
    if (nameMatch) info.nameJp = nameMatch[1].trim();

    // Category: <p class="category"><span>スターター</span></p>
    const catMatch = html.match(/<p\s+class="category"><span>([^<]+)<\/span>/);
    if (catMatch) info.category = catMatch[1].trim();

    // Release: <p class="release">2023.7.15発売</p>
    const relMatch = html.match(/<p\s+class="release">([^<]+)</);
    if (relMatch) info.release = relMatch[1].replace("発売", "").trim();

    // Price: <p class="price">¥1,980<span>
    const priceMatch = html.match(/<p\s+class="price">([^<]+)/);
    if (priceMatch) info.price = priceMatch[1].trim();

    return info;
  } catch (e) {
    console.error(`  Failed to fetch ${url}: ${e.message}`);
    return null;
  }
}

// Get existing product codes from prod-beys.json
function getExistingCodes() {
  try {
    const data = JSON.parse(fs.readFileSync(PROD_BEYS, "utf8"));
    const codes = new Set();
    data.forEach((entry) => {
      if (entry[0]) codes.add(entry[0]);
    });
    return codes;
  } catch (e) {
    return new Set();
  }
}

// Download product image if not exists
async function downloadImage(code) {
  const filename = code.replace(/-/g, "") + "@1.png";
  const localPath = path.join(PRODUCTS_DIR, filename);
  if (fs.existsSync(localPath)) return false;

  const imgUrl = BASE + `_image/${code.replace(/-/g, "")}@1.png`;
  try {
    const buf = await fetchBinary(imgUrl);
    if (buf.length < 1000) return false; // too small, probably 404
    fs.mkdirSync(PRODUCTS_DIR, { recursive: true });
    fs.writeFileSync(localPath, buf);
    console.log(`  Downloaded: ${filename} (${(buf.length / 1024).toFixed(1)}KB)`);
    return true;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log("Fetching lineup page...");
  const html = await fetch(BASE);
  const products = parseListingPage(html);
  console.log(`Found ${products.length} products on lineup page.`);

  const existing = getExistingCodes();
  console.log(`Existing in prod-beys.json: ${existing.size} codes.`);

  // Separate known vs new
  const known = products.filter((p) => existing.has(p.code));
  const newProducts = products.filter((p) => !existing.has(p.code));
  // Also find products with beys (not tools/accessories)
  const beyTypes = ["starter", "booster", "random_booster", "set"];
  const newBeys = newProducts.filter((p) => beyTypes.includes(p.type));
  const newTools = newProducts.filter((p) => !beyTypes.includes(p.type));

  console.log(`\nKnown: ${known.length}, New: ${newProducts.length} (${newBeys.length} beys, ${newTools.length} tools/other)`);

  if (newBeys.length > 0) {
    console.log("\n=== NEW BEYBLADE PRODUCTS ===");
    for (const p of newBeys) {
      const detail = await parseDetailPage(p.href);
      if (detail) {
        Object.assign(p, detail);
      }
      console.log(`  ${p.code} | ${p.nameJp || "?"} | ${p.category || p.type} | ${p.release || "?"} | ${p.price || "?"}`);
      // Try to download image
      await downloadImage(p.code);
    }
  }

  if (newTools.length > 0) {
    console.log("\n=== NEW TOOLS/ACCESSORIES ===");
    for (const p of newTools) {
      const detail = await parseDetailPage(p.href);
      if (detail) Object.assign(p, detail);
      console.log(`  ${p.code} | ${p.nameJp || "?"} | ${p.category || p.type} | ${p.release || "?"}`);
    }
  }

  if (newProducts.length === 0) {
    console.log("\nNo new products detected.");
  }

  // Save full scraped data
  const output = {
    scrapedAt: new Date().toISOString(),
    total: products.length,
    existingCount: existing.size,
    newCount: newProducts.length,
    products: products.map((p) => ({
      code: p.code,
      series: p.series,
      type: p.type,
      attr: p.attr,
      nameJp: p.nameJp || null,
      category: p.category || null,
      release: p.release || null,
      price: p.price || null,
      isNew: !existing.has(p.code),
    })),
  };

  // Only fetch details for new products (already done above)
  // For existing products, just save basic info from listing page

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`\nSaved to ${OUTPUT}`);
}

main().catch(console.error);
