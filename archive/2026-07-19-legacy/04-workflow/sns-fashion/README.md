# SNS 個人頁 → 日式版面節奏 × 中文時尚廣告海報工作流

依貼文原文與 `03-visual-draft/sns-參考圖片/` 的視覺語法，將一張 SNS 個人頁截圖轉成 4:5 都市時尚編輯海報。採用日式海報的高對比排版、色塊與文字／人物交錯，但以**繁體中文**呈現；截圖不重製為 UI，而是提煉成可讀的主張與信任資訊。

設計原則是「先讓人停下來，再讓人讀完」：第一眼只能有一個鉤子（人物眼神或巨型主標）、第二眼讀主張、第三眼才讀專業與追蹤資訊。不要把每個元素都做大，也不要以卡片或 UI 取代版面層級。

## 第一階段：圖片測試

將來源截圖暫存於本機安全位置（不要提交含個資的原圖），再執行預設的「巨型文字」版本：

```bash
INPUT_IMAGE=/absolute/path/to/sns-profile-header.png \
PROMPT_FILE=04-workflow/sns-fashion/key-visual.prompt.txt \
OUT=assets/drafts/sns-fashion-editorial-poster-v2.png \
IMG_SIZE=1024x1280 \
python3 04-workflow/gen_image.py
```

輸出要求：明亮、4:5、單一虛構東亞女性模特兒的近景三分之二身構圖，臉部完整清楚；日式構圖節奏與繁中時尚字體。主標使用「瘦，不必委屈自己。」，輔以帳號的核心專業與 1,285 人追蹤信任資訊。

### 切換圖形方向

`key-visual.prompt.txt` 是已校準的巨型文字預設。若要在保留相同人物、文案和安全規則下探索版面，先組合方向 prompt，再交給既有的 `gen_image.py`：

```bash
python3 04-workflow/sns-fashion/build_prompt.py \
  --direction urban-signal \
  --output /tmp/sns-fashion-urban-signal.prompt.txt

INPUT_IMAGE=/absolute/path/to/sns-profile-header.png \
PROMPT_FILE=/tmp/sns-fashion-urban-signal.prompt.txt \
OUT=assets/drafts/sns-fashion-urban-signal.png \
IMG_SIZE=1024x1280 \
python3 04-workflow/gen_image.py
```

| Direction | 適合情境 | 視覺鉤子 |
|---|---|---|
| `giant-type` | 預設貼文、強主張 | 斜切巨型繁中與人物交錯 |
| `editorial-cover` | 內容型貼文、專業感 | 編輯網格、底部資訊節奏 |
| `urban-signal` | 清邁生活、Reels 首圖 | 城市導線、方向性筆觸 |
| `repetition-grid` | 系列貼文、輪播封面 | 同一人物的連拍裁切與重複 |

完整方向規則在 [graphic-directions.md](graphic-directions.md)。每次只選一個方向；混用會削弱第一眼的視覺鉤子。

### 固定為完整 4:5 成品

內建生圖有時會回傳較長的直式畫布。不要直接裁掉上下內容；以補邊方式保留人物與排版，再輸出正確 4:5：

```bash
python3 04-workflow/fit_poster_canvas.py \
  --input /path/to/generated-poster.png \
  --output assets/drafts/sns-fashion-editorial-poster-v3-4x5.png \
  --ratio 4:5 \
  --background '#f7f3ef'
```

此步驟只延展畫布，不縮放或裁掉來源圖片；生成 prompt 亦要求所有關鍵資訊留在中央安全區，因此在社群預覽內仍能完整呈現。

### 驗收

- 不能出現 SNS UI、Logo 或水印；僅以編輯式層級呈現指定的主標、專業、生活主題與追蹤資訊。
- 人物必須是虛構模特兒，不得辨識為來源帳號本人、名人或既有模特兒。
- 應有明亮城市反射光／高調棚拍、時尚服裝與色塊和繁中排版的強烈視覺記憶點。
- 文字、人物、色塊須彼此交錯；文字可跨過衣服與身體下半部，但臉部必須完整露出且不被文字遮住。
- 3 秒檢查：縮小預覽時，仍應先讀到主標或人物眼神；若所有小字、裝飾、色塊同時跳出，應減少而不是增加元素。
- 發佈前逐字檢查文案。生圖模型一旦讓繁中小字失真，保留已核可的攝影與圖形層級，改在 Canva、Figma 或剪映以真實字體覆蓋小字；不可發佈錯字或額外文字。

## 第二階段：影片（暫不生成）

確認海報視覺後，依 [video-plan.md](video-plan.md) 重新取景成 9:16，再拆成 8 秒＋7 秒兩段生成。這符合目前 Seedance 單段最長 12 秒的限制。
