# 製作 Runbook

以下路徑均以 repo 根目錄 `/home/ivan-bai/projects/seedance` 為基準。

## 1. 鎖定製作分工

- 生成模型：只製作四國各自的真人物動態鏡頭。
- DaVinci Resolve：主剪輯、節奏、轉場、音效、調色與最終廣告合成。
- Remotion：只處理可複用片尾、字幕與批量尺寸／語言版本。

不再用靜態圖片推拉代替人物動態，也不再讓生成模型一次完成四國、字幕、照片牆與品牌收尾。

## 2. 每國先生成首幀與尾幀

每國固定製作兩張 16:9 圖片：

- 首幀：同一位旅攝女孩已在該地，雙手自然持相機於胸前或腰間，準備舉機。
- 尾幀：同一位女孩完成舉機，相機貼近眼前，姿勢自然，地標仍能辨識。

首尾兩張之間只描述一個可生成的動作：「自然舉起相機」。快門白閃、POV、照片顯影與跨國轉場均留給 DaVinci。

輸出路徑固定為：

```text
outputs/frames/01-kyoto-start-v1.png
outputs/frames/01-kyoto-end-v1.png
outputs/frames/02-seoul-start-v1.png
outputs/frames/02-seoul-end-v1.png
outputs/frames/03-chiang-mai-start-v1.png
outputs/frames/03-chiang-mai-end-v1.png
outputs/frames/04-san-francisco-start-v1.png
outputs/frames/04-san-francisco-end-v1.png
```

## 3. 逐張人工核准

每次只展示一張圖，依以下項目檢查：

1. 臉、髮型、服裝、背包與相機是否與角色基準一致。
2. 手指、手臂、相機及背帶是否正常，沒有穿模或重複物件。
3. 地標是否正確且沒有混入其他國家符號。
4. 首尾幀的構圖、光線與畫風是否能自然銜接。
5. 圖片是否完全沒有模型生成文字、Logo、UI 或浮水印。

只有使用者明確核准後，才更新 [frame-approval.md](frame-approval.md)。如被退回，產生新版本並再次檢查。

## 4. 首尾幀皆核准後才生成單國影片

執行前必須確認同一國家的兩個狀態都為 `APPROVED`：

```bash
FIRST_FRAME=04-workflow/travel-photographer-google-ads/outputs/frames/01-kyoto-start-v1.png \
LAST_FRAME=04-workflow/travel-photographer-google-ads/outputs/frames/01-kyoto-end-v1.png \
PROMPT_FILE=04-workflow/travel-photographer-google-ads/prompts/scenes/01-kyoto-motion.prompt.txt \
DURATION=5 ASPECT=16:9 CAMERA_FIXED=0 \
python3 04-workflow/gen_video.py
```

影片只要求首尾幀之間的自然動作、衣服與髮絲微動、呼吸、視線及合理的手臂軌跡。若人物凍結、臉部漂移或手部異常，直接重生該國片段，不用靜態動畫補救。

## 5. DaVinci Resolve 後製

1. 四國各挑選最佳完整動態段落。
2. 以快門聲與 2–4 幀白閃作為主要剪接點。
3. 可於白閃後短暫切入純地標 POV，但不要把靜態人物當作影片主體。
4. 統一四段色彩、顆粒、相機聲與環境音。
5. 最後才加入四張照片及極簡品牌 end card。
6. 字幕、網址與 CTA 全部後製，禁止使用模型生成文字。

## 6. Remotion 的限制用途

Remotion 不負責四國人物主段落的創意剪輯。只有在主剪版核准後，才可用於：

- 套用固定品牌片尾。
- 替換精準字幕、網址與 CTA。
- 批量輸出 16:9、1:1、9:16。
- 批量替換不同語言或活動文案。

---

## 舊流程封存

以下故事板、單次 12 秒生成與靜態推拉方法僅供歷史參考，不再用於正式成片。

### 舊：先做 2×2 場景故事板

```bash
INPUT_IMAGE=04-workflow/travel-photographer-google-ads/references/character-sheet.png \
PROMPT_FILE=04-workflow/travel-photographer-google-ads/prompts/storyboard-4panel.prompt.txt \
OUT=04-workflow/travel-photographer-google-ads/outputs/storyboard-4panel.png \
IMG_SIZE=1024x1024 \
python3 04-workflow/gen_image.py
```

故事板只用來核可構圖、角色一致性與地標，不直接當正式字幕圖。

接著生成 4×4 細節 shotboard，確認拉鍊／取機、四地觀景窗 POV、快門與拍立得結果：

```bash
INPUT_IMAGE=04-workflow/travel-photographer-google-ads/references/character-sheet.png \
PROMPT_FILE=04-workflow/travel-photographer-google-ads/prompts/detail-shotboard-16panel-v2.prompt.txt \
OUT=04-workflow/travel-photographer-google-ads/outputs/detail-shotboard-16panel-v2.png \
IMG_SIZE=1024x1536 \
python3 04-workflow/gen_image.py
```

### 舊：生成四張 9:16 keyframe

每張都以角色設定表作輸入圖，四次分開執行。Keyframe 會以背包、轉盤、對焦環或快門的近距離構圖開場，但仍須在散焦背景保留同一角色與正確地標線索：

```bash
INPUT_IMAGE=04-workflow/travel-photographer-google-ads/references/character-sheet.png \
PROMPT_FILE=04-workflow/travel-photographer-google-ads/prompts/keyframes/01-kyoto.prompt.txt \
OUT=04-workflow/travel-photographer-google-ads/outputs/keyframes/01-kyoto.png \
IMG_SIZE=720x1280 python3 04-workflow/gen_image.py
```

將檔名依序改為 `02-seoul`、`03-chiang-mai`、`04-san-francisco` 後再執行。每張生成後先依 [qa-checklist.md](qa-checklist.md) 核可，再進入生片，避免浪費影片費用。

### 舊：四段分開生片

```bash
FIRST_FRAME=04-workflow/travel-photographer-google-ads/outputs/keyframes/01-kyoto.png \
PROMPT_FILE=04-workflow/travel-photographer-google-ads/prompts/scenes/01-kyoto.prompt.txt \
DURATION=5 ASPECT=9:16 CAMERA_FIXED=0 \
python3 04-workflow/gen_video.py
```

依序替換成 02–04 的 keyframe 與 scene prompt。每段 5 秒保留完整操作與前後 handle；剪輯時將京都整理為 2.55 秒，其餘三地各 2.2 秒。需要壓縮時只縮短操作前後的停頓，或做平順 speed-ramp；手指接觸、轉盤 click、AF beep 與快門完成幀不得被切掉。`gen_video.py` 會回傳下載位置；完成後將素材命名至 `outputs/clips/01-kyoto.mp4` 等。

### 舊：單次 12 秒

```bash
FIRST_FRAME=04-workflow/travel-photographer-google-ads/outputs/keyframes/01-kyoto.png \
PROMPT_FILE=04-workflow/travel-photographer-google-ads/prompts/master-12s.prompt.txt \
DURATION=12 ASPECT=9:16 CAMERA_FIXED=0 \
python3 04-workflow/gen_video.py
```

若出現換臉、國家漏拍、地標混合或字幕亂碼，不再反覆抽卡，改走 3A。

### 舊：後製 12 秒母版

1. 依 [video-plan.md](video-plan.md) 排入四段最佳片段；細節操作必須完整，不能從手尚未接觸就跳到完成狀態。
2. 逐項依 [camera-detail-plan.md](camera-detail-plan.md) 校對鏡位、rack focus、J-cut 與接觸幀音效。
3. 以鏡片遮幅、2–4 幀快門閃白或前景 wipe 銜接；禁止無動機硬切與花式轉場。
4. 9.15 秒建立四張照片 contact sheet；10.20 秒切品牌 end card。
5. 使用真實字體加入國家標籤、品牌主張、網址與 CTA。
6. 每張拍立得下方白邊以相同樣式後製精確字串 `aw-esim.com`；不得採用模型生成文字。
7. 加入實物相機聲、觀景窗 AF beep、KATA 快門、相紙滑出聲、J-cut 環境音、音樂與一句可選旁白；完成無聲檢查。

### 舊：輸出與投放前檢查

- 先完成 1080×1920 母版，再由同一時間線重新構圖 1080×1080 與 1920×1080。
- 不直接 center-crop；每個畫幅都重新定位角色、地標與文字。
- 上傳 YouTube 可設 public 或 unlisted，再於 Google Ads 以實際 placement preview 檢查 Shorts／in-feed／in-stream。
