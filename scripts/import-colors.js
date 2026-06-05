#!/usr/bin/env node
// 從 phstudy (beyblade.phstudy.org) 匯入「零件顏色」資料。
//
// phstudy 用影像分析得到每個零件 SKU 的主色，存在 data/part_colors.json；
// data/main.json 則有每個零件的 base_set_id(商品代號) + en_name(短代碼) + id(SKU)。
// 我們用「商品代號 + 短代碼」join，輸出精簡的 data/part-colors.json 供 build 嵌入。
//
// 輸出格式：
//   { "bit": { "<商品代號>|<軸代碼>": ["color", ...] },
//     "rat": { "<商品代號>|<固鎖代碼>": ["color", ...] },
//     "_meta": { source, generatedAt, counts } }
//
// 用法: node scripts/import-colors.js   (需要網路；只在開發時跑一次)

const fs = require("fs");
const path = require("path");

const BASE = "https://beyblade.phstudy.org";
const OUT = path.join(__dirname, "..", "data", "part-colors.json");

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

function buildMap(part, colors) {
  // part: main.json 的某個 BeybladeParts* 物件；colors: SKU id -> [color]
  const map = {};
  for (const id of Object.keys(part)) {
    const e = part[id];
    const base = e.base_set_id;
    const code = e.en_name;
    if (!base || code == null || code === "") continue;
    const cs = colors[id];
    if (!cs || !cs.length) continue;
    const key = base + "|" + code;
    const set = map[key] || (map[key] = []);
    for (const c of cs) if (!set.includes(c)) set.push(c);
  }
  return map;
}

(async () => {
  console.log("下載 phstudy 資料中…");
  const [main, colors] = await Promise.all([
    getJSON(`${BASE}/data/main.json`),
    getJSON(`${BASE}/data/part_colors.json`),
  ]);
  const data = main.data;

  const bit = buildMap(data.BeybladePartsBit, colors);
  const rat = buildMap(data.BeybladePartsRatchet, colors);

  const out = {
    bit,
    rat,
    _meta: {
      source: BASE,
      generatedAt: new Date().toISOString().slice(0, 10),
      counts: { bit: Object.keys(bit).length, rat: Object.keys(rat).length },
    },
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0) + "\n");
  console.log(`寫入 ${OUT}  軸 ${out._meta.counts.bit} 筆 / 固鎖 ${out._meta.counts.rat} 筆`);
})().catch((e) => {
  console.error("失敗:", e.message);
  process.exit(1);
});
