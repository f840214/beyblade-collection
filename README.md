# Beyblade X 收藏管理

單頁 HTML 工具，幫你管理手上有哪些 Beyblade X 商品 / 零件、還缺什麼，並支援 JSON 匯入匯出。資料庫來自 [go-shoot.github.io/x](https://go-shoot.github.io/x/)。

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
| `data/*.json` | 從 go-shoot 抓下來的零件 / 商品資料庫 |
| `build.js` | 把 `data/*.json` 嵌進 `template.html`，輸出 `index.html` |
| `index.html` | 打包後的成品（被 `build.js` 覆寫，不要直接編輯） |

修改 `template.html` 或更新 `data/` 裡的 JSON 後，重跑 `node build.js` 即可。

## 功能

- **商品分頁**：依系列（BX、BXG、CX、UX…）分組，搜尋商品代號（例如 `BX-35`）或零件名（中英日文皆可）。每個變體可用 ＋／− 或輸入數量管理擁有
- **零件分頁**：Blade / Ratchet / Bit 三大類，點開零件可看「來自哪些商品」，已擁有的來源標綠
- **統計列**：頂部即時顯示已擁有變體數、各類零件覆蓋率
- **篩選**：只看擁有 / 只看缺少 / 依系列
- **JSON 匯入匯出**：可下載備份；匯入時可選「取代」或「合併」現有收藏
- **離線可用**：所有資料內嵌在 `index.html`，無外部請求

## JSON 格式

匯出檔長這樣：

```json
{
  "schema": "beyx_collection",
  "version": 1,
  "exportedAt": "2026-04-27T01:23:45.000Z",
  "summary": { "variants": 12, "parts": { "blade": 8, "ratchet": 6, "bit": 5 } },
  "owned": {
    "BX-35#3": 1,
    "BX-49#0": 2
  }
}
```

`owned` 的 key 是 `<商品代號>#<變體索引>`，索引對應該商品在 `data/prod-beys.json` 中出現的順序。匯入時也可以只給 `{"owned": {...}}` 或直接 `{...}`（會嘗試當作 `owned`）。

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

## 資料來源

零件、商品資料整理自 [go-shoot.github.io/x](https://go-shoot.github.io/x/)（非官方 Beyblade X 中文資訊站）。本工具僅供個人收藏管理使用。
