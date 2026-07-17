# 陀螺資料更新 SOP

每次要「抓新陀螺 + 讓它在商品頁搜得到」都照這份流程走。

## 背景：兩個資料層

| 資料 | 用途 | 誰會出現 |
|------|------|----------|
| `data/lineup-scraped.json` | 爬蟲輸出，前端 runtime fetch | **情報 tab**（紅點通知）|
| `data/prod-beys.json` | 商品/變體主檔，build 進 index.html | **商品 tab**（可搜尋、可標擁有）|

> 關鍵：爬蟲**只**寫 `lineup-scraped.json`。新品要在「商品」頁搜得到，**必須手動補進 `prod-beys.json`**。這是「情報有、商品搜不到」的根本原因。

## 步驟

### 1. 跑爬蟲
```bash
node scripts/scrape-lineup.js
```
> 注意：每日 GitHub Action（台灣 17:00）也會自動跑並提交。手動跑常會撞上自動提交，push 時需 rebase（見步驟 6）。只是想看有沒有新品，直接看情報 tab 紅點即可。

### 2. 找出「情報有、prod-beys 沒有」的正規陀螺
```bash
node -e "
const beys=require('./data/prod-beys.json');
const have=new Set(beys.map(e=>e[0]));
const lineup=require('./data/lineup-scraped.json').products;
const beyTypes=['starter','booster','random_booster','set'];
const missing=lineup.filter(p=>beyTypes.includes(p.type)&&!have.has(p.code)&&!/^...?-00/.test(p.code));
for(const p of missing) console.log(p.code,'|',p.type,'|',p.nameJp||'?','|',p.release,'|',p.price);
"
```
- 排除 `-00`（BX-00 限定/聯名）、`tool`（收納盒等配件）。
- `?`（無日文名）的多半是 BXA/BXC/BXH 亞洲/中國限定，官網也沒資料，通常略過。

### 3. 取得每個新品的規格
- 商品頁：`https://beyblade.takaratomy.co.jp/beyblade-x/lineup/<code>.html`（如 `ux20.html`）。
- 需要：戰刃(Blade)、固鎖(Ratchet)、軸(Bit)、類型(att/def/sta/bal)、中文名。
- lineup 記錄裡的 `attr` 欄已含類型（att/def/sta/bal），可直接用。

### 4. 若戰刃是新的 → 先加進 `data/part-blade.json`
- 代號用 eng 縮寫慣例：每個字取前 2 碼，如 GloryValkyrie → `GlVl`、MetalDagger → `MtDg`。
- 中文名沿用專案既有譯名（如 ワルキューレ=戰神、グローリー=榮耀）。
- 欄位：`group`(BX/UX/CX)、`names`{jap,eng,chi}、`stat`、`desc`、`attr`。
- **stat 拿不到就留 `[]`，不要亂編**。
- **UX Expand Blade（固鎖一體化）**：combo 字串的固鎖位用 `=`，如 `GlVl = LF`（比照 UX-19 `BlGr = H`）。

### 5. 追加商品到 `data/prod-beys.json` — **務必加在陣列末尾**
```jsonc
["UX-20","S","GlVl = LF"]
```
- 格式：`[商品代號, 類別, "Blade Ratchet Bit", 選填YouTubeID, 選填{coat/get...}]`
- 類別：`S`/`St`=Starter、`B`=Booster、`RB`/`RB H`=Random Booster、`Set`…
- **絕對不可插入中間**：variant ID = `productId#index`，插入會移位破壞已存的 owned 資料。
- 多變體（隨機補充包等）就一個商品多筆，依序排。

### 6. build + commit + push
```bash
node build.js                 # 重新產生 index.html，會自動升版號（SW 清舊快取）
git add -A
git commit -m "prod-beys: 追加 <code> <名稱>"
git push
```
若 push 被拒（遠端有每日 Action 的自動提交）：
```bash
git pull --rebase             # lineup-scraped.json 常衝突
node scripts/scrape-lineup.js # 重跑爬蟲重新生成，deterministic 解衝突
node build.js
git add -A
GIT_EDITOR=true git rebase --continue
git push
```

## 檢查清單
- [ ] 新戰刃已加進 `part-blade.json`（若有）
- [ ] 商品加在 `prod-beys.json` **末尾**，未插入中間
- [ ] `node build.js` 成功、版號有升
- [ ] 商品頁能用代號 / 中文名 / 軸搜到
