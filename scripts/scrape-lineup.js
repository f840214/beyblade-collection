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
      if (res.statusCode !== 200) return reject(new Error("HTTP " + res.statusCode));
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// Parse all product data from the listing page HTML
function parseListingPage(html) {
  const products = [];
  // Match each <li> block with all its content
  const re = /<li\s+class="mix\s+([^"]+)"\s+data-release-date="(\d+)"[^>]*>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html))) {
    const classes = m[1];
    const order = parseInt(m[2]);
    const block = m[3];

    // Extract href
    const hrefMatch = block.match(/href="([^"]+\.html)"/);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];

    // Extract product code from href
    const codeMatch = href.match(/^([a-z]+)(\d+)(?:-([a-z0-9]+))?\.html$/);
    if (!codeMatch) continue;
    const prefix = codeMatch[1].toUpperCase();
    const num = codeMatch[2];
    const suffix = codeMatch[3] ? `-${codeMatch[3].toUpperCase()}` : "";
    const code = `${prefix}-${num}${suffix}`;

    // Extract name from <b>BX-01<span>ドランソード3-60F</span></b>
    const nameMatch = block.match(/<b>[^<]*<span>([^<]+)<\/span><\/b>/);
    const nameJp = nameMatch ? nameMatch[1].trim() : null;

    // Extract category from <p class="category"><span>スターター</span></p>
    const catMatch = block.match(/class="category"><span>([^<]+)<\/span>/);
    const category = catMatch ? catMatch[1].trim() : null;

    // Extract price from <i>¥1,980（税込）</i>
    const priceMatch = block.match(/<i>(¥[^<]+)<\/i>/);
    const price = priceMatch ? priceMatch[1].replace("（税込）", "").trim() : null;

    // Extract release date from <i class="red">2023.7.15発売</i>
    const relMatch = block.match(/<i[^>]*>(\d{4}\.\d+\.\d+)発売/);
    const release = relMatch ? relMatch[1] : null;

    // Extract image from <img src="_image/BX01_list.png"
    const imgMatch = block.match(/src="(_image\/[^"]+)"/);
    const img = imgMatch ? imgMatch[1] : null;

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

    products.push({ code, series, type, attr, nameJp, category, release, price, img, order });
  }
  return products;
}

// Get existing product codes from prod-beys.json
function getExistingCodes() {
  try {
    const data = JSON.parse(fs.readFileSync(PROD_BEYS, "utf8"));
    const codes = new Set();
    data.forEach((entry) => { if (entry[0]) codes.add(entry[0]); });
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
    if (buf.length < 1000) return false;
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

  const beyTypes = ["starter", "booster", "random_booster", "set"];
  const newProducts = products.filter((p) => !existing.has(p.code));
  const newBeys = newProducts.filter((p) => beyTypes.includes(p.type));

  console.log(`\nNew: ${newProducts.length} (${newBeys.length} beys)`);

  if (newBeys.length > 0) {
    console.log("\n=== NEW BEYBLADE PRODUCTS ===");
    for (const p of newBeys) {
      console.log(`  ${p.code} | ${p.nameJp || "?"} | ${p.category || p.type} | ${p.release || "?"} | ${p.price || "?"}`);
      await downloadImage(p.code);
    }
  }

  if (newProducts.length === 0) {
    console.log("\nNo new products detected.");
  }

  // Save — sorted by release date (newest first)
  const sorted = [...products].sort((a, b) => {
    if (!a.release && !b.release) return b.order - a.order;
    if (!a.release) return 1;
    if (!b.release) return -1;
    return b.release.localeCompare(a.release) || b.order - a.order;
  });

  const output = {
    scrapedAt: new Date().toISOString(),
    total: products.length,
    products: sorted.map((p) => ({
      code: p.code,
      series: p.series,
      type: p.type,
      attr: p.attr,
      nameJp: p.nameJp,
      category: p.category,
      release: p.release,
      price: p.price,
      img: p.img,
      inCollection: existing.has(p.code),
    })),
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`\nSaved to ${OUTPUT}`);
}

main().catch(console.error);
