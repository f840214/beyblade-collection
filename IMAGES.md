# 圖片資產維護筆記

記錄圖片從哪來、怎麼處理、為什麼選現在這版。給未來補資料的自己看的。

## 目錄結構

| 資料夾 | 內容 | 大小 | 來源 |
|---|---|---|---|
| `bits/` | 51 張軸圖（透明 PNG） | ~1.5 MB | go-shoot 預先 rembg 過的版本 |
| `blades/` | 戰刃圖（單體 + CX 子件） | ~9 MB | go-shoot 預先 rembg 過的版本 |
| `products/` | 109 張商品照（透明 PNG） | ~27 MB | Takara Tomy 官方 + 自己跑 rembg 去背 |
| `icon-192.png`, `icon-512.png` | PWA / 瀏覽器 favicon | – | 手繪像素藝術 |

`bits-backup/` 是本機備份（35MB waifu2x 4x 升級的舊版），已加到 `.gitignore` 不會 push。

## 程式裡的圖片來源函式

`template.html` 內：

```js
function bitImageSrc(code)    { return `bits/${code}.png`; }
function bladeImageSrc(code)  { /* 單體 → blades/{code}.png；CX 組合刃拆段渲染 */ }
function productImageSrc(pid) { return `products/${pid.replace(/-/g,'')}@1.png`; }
```

CX 戰刃由 `cxBladeSegments(code)` 拆段，每段映射到 `blades/CX/{chip|main|metal|over|assist}/{abbr}.png`。

## 軸（bits/）— 走過的路

試過 4 種來源，最後選 go-shoot 那版。

| 版本 | commit | 評價 |
|---|---|---|
| 從你截圖手動切 17 張攻擊軸 | `7470bb9` | 低解析、有黑底+字幕 |
| waifu2x 4x 升級 | `b94823b` | 解析度高但仍有黑底+字幕 |
| **go-shoot 透明去背 ←現在這版** | `08dea0a` / `fd192b5` | ~150-300px 小但乾淨統一 |
| rembg + isnet（從 waifu2x 來源做） | `e9086be` | 高解析但邊緣有些不一致 |
| rembg + birefnet | `c8afcfa` | 半透明處理較好但整體有些清楚有些不清楚 |

**為什麼定在 go-shoot 版**：解析度雖小，但每隻軸的處理品質一致，沒有「有些清楚有些不清楚」的問題。CSS 把容器 max-height 限在 220px，小尺寸圖剛好夠用。

如果未來要再試 rembg：
- `birefnet-general` 對半透明塑膠（O 軸的透明套筒、N 軸的針）比 `isnet-general-use` 好
- isnet 對不透明色塊的邊緣銳一點
- 兩者都會在某些軸上失手，個別軸可能要混搭模型

## 商品（products/）— rembg 流程

```python
from rembg import remove, new_session
session = new_session("isnet-general-use")
out = remove(open("BX03@1.png","rb").read(), session=session)
open("products/BX03@1.png","wb").write(out)
```

- 模型：`isnet-general-use`（同 go-shoot 用的）
- 來源：`https://beyblade.takaratomy.co.jp/beyblade-x/lineup/_image/{code_no_dash}@1.png`
- 涵蓋：BX / BXG / CX / UX 系列（共 118 個產品 ID 中 109 張抓得到）
- 抓不到：BXH（Hasbro 海外版）、BXA、BXC 部分聯名 — `onerror` 會把容器隱藏

**舊版的失敗**：原本用 `u2net` 模型，碰到 deck set 那種「淺色小零件貼白底」（例：UX-10 上排 6 個透明發射器）會把它們當背景一起去掉。換 `isnet-general-use` 就解了。

## 戰刃（blades/）

直接從 go-shoot mirror 下來的（154 張），沒自己跑 rembg。go-shoot 有：

- `blades/{abbr}.png` — 一體式戰刃（DrSt、WzRd…）
- `blades/CX/{type}/{abbr}.png` — CX 子件，type ∈ {chip, main, metal, over, assist, hasbro}

7 張上游沒的：HvRn、BsBr、Grog、Snow、CX/hasbro/Wr、CX/hasbro/Ft、CX/hasbro/At — `onerror` 隱藏。

## 補資料的步驟

新商品上市時：

```bash
# 1. 同步資料庫（go-shoot 維護）
cd data
for f in prod-beys part-blade part-blade-collab part-blade-divided part-ratchet part-bit meta; do
  curl -sLO "https://go-shoot.github.io/x/db/${f}.json"
done
cd ..

# 2. 跑 rembg 補新商品圖（已存在的會 skip）
python3 /tmp/process_products.py   # 用 isnet-general-use

# 3. 補新戰刃圖
python3 /tmp/fetch_blades.py       # 從 go-shoot mirror

# 4. 重 build
node build.js
```

> 註：`process_products.py` 和 `fetch_blades.py` 目前還在 `/tmp/`，未進版控。要長期維護可以挪進 `scripts/`。

## rembg 模型切換速查

```python
# 不同來源 → 推薦模型
new_session("isnet-general-use")  # 商品照（白底攝影棚）、淺色物件
new_session("birefnet-general")   # 半透明塑膠、複雜邊緣
new_session("u2net")              # 一般用途、檔案最小，但對淺色貼白底會失手
```

第一次用會自動下載模型到 `~/.u2net/`：
- `u2net.onnx` 176 MB
- `isnet-general-use.onnx` 179 MB
- `birefnet-general.onnx` ~880 MB（較大）

## icon

- 來源：`/Users/benji/Desktop/Icon_bb.png`（1254×1254 像素藝術）
- 縮成 `icon-512.png` 跟 `icon-192.png`（用 `sips -z`）
- HTML / `manifest.json` 都指向這兩個檔
