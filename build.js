#!/usr/bin/env node
// 將 data/*.json 與 template.html 打包成單檔 index.html
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DATA = path.join(ROOT, "data");

const load = (name) => JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8"));

const db = {
  beys:          load("prod-beys.json"),
  blade:         load("part-blade.json"),
  bladeCollab:   load("part-blade-collab.json"),
  bladeDivided: load("part-blade-divided.json"),
  ratchet:       load("part-ratchet.json"),
  bit:           load("part-bit.json"),
};

const template = fs.readFileSync(path.join(ROOT, "template.html"), "utf8");
const out = template.replace("/*__DATA__*/", "window.DB = " + JSON.stringify(db) + ";");
const dest = path.join(ROOT, "index.html");
fs.writeFileSync(dest, out);
console.log(`Wrote ${dest}  (${out.length.toLocaleString()} bytes)`);
