#!/usr/bin/env node
// 將 data/*.json 與 template.html 打包成單檔 index.html
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

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

// 版本號: v0.{commit數+1}.{短SHA}; 還沒 commit 過就用 dev
let version = "dev";
try {
  // commit 數會包含尚未 commit 的這次，所以 +1 (跑 build 時通常還沒 commit)
  const count = cp.execSync("git rev-list --count HEAD", { cwd: ROOT }).toString().trim();
  const sha   = cp.execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
  version = `v0.${parseInt(count, 10) + 1}.${sha}`;
} catch (e) {}
const buildDate = new Date().toISOString().slice(0, 10);

const template = fs.readFileSync(path.join(ROOT, "template.html"), "utf8");
const out = template
  .replace("/*__DATA__*/", "window.DB = " + JSON.stringify(db) + ";")
  .replaceAll("__VERSION__", version)
  .replaceAll("__BUILD_DATE__", buildDate);
const dest = path.join(ROOT, "index.html");
fs.writeFileSync(dest, out);
console.log(`Wrote ${dest}  (${out.length.toLocaleString()} bytes)  ${version}`);
