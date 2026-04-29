# Beyblade X 收藏管理

單頁 HTML 工具，幫你管理手上有哪些 Beyblade X 商品 / 零件、還缺什麼。資料庫來自 [go-shoot.github.io/x](https://go-shoot.github.io/x/)。

## 快速開始

```bash
node build.js     # 產出 index.html
open index.html   # macOS；Windows 用 start，Linux 用 xdg-open
```

打包好的 `index.html` 可直接雙擊開啟，不需伺服器；收藏資料存在瀏覽器 `localStorage`。

## 檔案結構

| 檔案 | 用途 |
|---|---|
| `template.html` | UI、樣式與所有 JS 邏輯。要改功能就改這個 |
| `data/prod-beys.json` | 商品 / 變體列表 |
| `data/part-blade*.json` | 戰刃資料庫（一體 BX/UX、聯名/復刻、CX 組合段） |
| `data/part-ratchet.json`, `data/part-bit.json` | 固鎖、軸資料 |
| `data/tier.json` | 排行榜資料（戰刃/固鎖/軸 各 T0–T5） |
| `build.js` | 把 `data/*.json` 嵌進 `template.html`，輸出 `index.html` |
| `index.html` | 打包後的成品（被 `build.js` 覆寫，不要直接編輯） |
| `check-tier.js` | 開發用：對照排行榜中文名 vs 資料庫中文名 |

修改 `template.html` 或更新 `data/` 裡的 JSON 後，重跑 `node build.js` 即可。

## 功能

- **商品**：依系列（BX、BXG、CX、UX…）分組，搜尋代號（例 `BX-35` / `ux09`）或零件中英日文名。每個變體可 ＋／− 管理擁有數量
- **零件**：戰刃 / 固鎖 / 軸 三類，點開可看「來自哪些商品」，已擁有的來源標綠。CX 組合戰刃會由各段（chip / metal / main / over / assist）的中文自動組合（例：`Bh.Bl.B.K → 龍王閃擊`）
- **收藏**：擁有的商品 + 各類零件一頁總覽
- **配置**：自訂戰刃 / 固鎖 / 軸組合並追蹤是否齊全
- **排行榜**：T0–T5 分級顯示戰刃 / 固鎖 / 軸；勾「標示已擁有」會把擁有的標綠、缺的淡掉。pill 可點：單片戰刃跳到零件頁、CX 組合 / 段名跳到對應商品
- **匯入匯出**：JSON 完整格式或 `BEYX1:` 短碼（gzip + base64，方便分享）。匯入時可選「取代」或「合併」
- **分享**：把目前收藏渲染成 PNG（標題可自訂、可選擇是否印上短碼讓朋友拍照匯入），透過 Web Share API 分享或直接下載
- **離線可用**：所有資料內嵌在 `index.html`，無外部請求；可加到主畫面當 PWA

## 匯出格式

完整 JSON：

```json
{
  "schema": "beyx_collection",
  "version": 1,
  "exportedAt": "2026-04-29T01:23:45.000Z",
  "owned": {
    "BX-35#3": 1,
    "CX-11#0": 2
  },
  "builds": [
    { "id": "b...", "name": "蒼龍爆刃", "blade": "DrBs", "ratchet": "2-80", "bit": "Q", "note": "" }
  ]
}
```

`owned` 的 key 是 `<商品代號>#<變體索引>`，索引對應該商品在 `data/prod-beys.json` 中出現的順序。匯入時也可只給 `{"owned": {...}}` 或直接 `{...}`（會嘗試當作 `owned`）。

短碼：以 `BEYX1:` 開頭的單行字串，是上述 JSON 經 gzip + base64 後的結果，貼回匯入欄就會自動解壓。

## 占位符

來源資料用 `/`、`.`、`=` 表示「該位置沒有零件」（例如單售零件包 `/ / V`、CX 組合空段 `Pg./.M`、無固鎖變體 `Em.Mg.H = Op`）。這些都不會計入擁有數或在零件清單中出現。

## 更新資料庫

來源網站若新增商品 / 零件，重抓即可：

```bash
cd data
for f in prod-beys part-blade part-blade-collab part-blade-divided part-ratchet part-bit meta; do
  curl -sLO "https://go-shoot.github.io/x/db/${f}.json"
done
cd ..
node build.js
```

排行榜（`tier.json`）是手動維護，跟資料庫無關。

## 資料來源

零件、商品資料整理自 [go-shoot.github.io/x](https://go-shoot.github.io/x/)（非官方 Beyblade X 中文資訊站）。本工具僅供個人收藏管理使用。
