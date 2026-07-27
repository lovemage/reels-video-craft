# M4 · 手繪日記漫畫 + 真人懸浮頭像

> 階段清單、關卡與注意事項見 [`../WORKFLOWS.md`](../WORKFLOWS.md)。這份只補長篇實作細節。

用 `story-to-handdrawn-video` skill 產生手繪背景，搭配右上角真人懸浮頭像、專案字幕元件與吉祥物動畫。

這套流程比純 Remotion／GBRO 都多一道「時間點比對校正」，原因是 `story-to-handdrawn-video` 是通用故事文案工具，本身不知道我們真人配音的實際停頓。**漏了這一步，畫面切換節奏會跟語音完全對不上。**

## 1. 先完成語音

真人錄音或 TTS → auto-editor first pass → 轉錄 → 人工核對逐字稿裡明顯聽錯的字（比對原音）→ 輸出乾淨的 `public/captions/captions.json`。這一步跟其他方式相同，不能跳過。

## 2. 整理故事文本

把校正後的逐字稿改寫成故事文本（例如 `story-input.zh.txt`），保留原始措辭與語氣，**只把過長的複合句拆成較短的句子**。

技能本身會依標點自動分句；句子太長、標點太少時，容易在句子中間硬切、甚至切斷一個詞。先斷句可以避免這個問題。存成 UTF-8 純文字檔。

## 3. 產生分鏡規劃（免費、不生圖）

```bash
export STORY_VIDEO_PROJECT=<repo>/shared/story-to-handdrawn-video
cd "$STORY_VIDEO_PROJECT"
python3 scripts/run_story_video.py \
  --input <story-input.zh.txt> \
  --title "<標題>" \
  --format 9:16 \
  --mode plan
```

美術風格（純白底、氈頭筆黑線、局部蠟筆色、大量留白）與角色鎖定由技能腳本依它自己的 `DESIGN.md` 自動產生。

> **不要自行編寫美術風格提示詞，也不要沿用其他專案的暖紙／水彩風格。** 那是不同技能、不同視覺系統，混用等於違背這個方式存在的意義。

## 4. 生圖與匯入

plan 產出的 prompt 在 `prompts/generated/codex/<batch>/`，交給 Codex Image2 生成（可由使用者的 Codex 工作階段執行，助手只需準備好 prompt，不必自己呼叫付費 API）。全部生成後：

```bash
python3 scripts/run_story_video.py --mode import
python3 scripts/run_story_video.py --format 9:16 --mode render
```

- `import` 會本地衍生黑白稿並對齊畫布。
- `render` 出技能自己節奏估算的靜音手繪畫面軌——**僅供參考，不是最終時間軸**。

## 5. 用真實旁白時間校正分鏡

技能估的 `duration_sec` 只是粗略節奏，不能直接當最終時間軸。

用每段 `narration` 文字比對 `captions.json` 的真實時間戳：

- 字元級 fuzzy match
- **用單調游標往前搜尋**，避免同樣的詞在文本別處被誤配到
- 算出每段真正的 `from`／`to` frame，取代技能估的秒數

## 6. 在 Remotion 組裝

- 用 `<Img>` 逐段讀取匯入的手繪彩色靜態圖（`storyboard/stills/NN.png`），依步驟 5 算出的 frame 區間包進 `Sequence`，加上慢速 Ken Burns 位移縮放做動態。

  > **不要直接沿用技能內建的 `text → bw_full → color` 揭示動畫**：那個節奏是技能自己估的，會跟真人語音對不上；而且它的手寫字幕固定佔用畫面上方安全區，跟本專案的字幕系統會疊在一起。

- 真人剪輯過的影片（例如 `voiceover-final.mp4`）當右上角圓形懸浮頭像，**靜音播放**；旁白走獨立 `<Audio>` 音軌。
- 複製 `shared/subtitle-mascot-kit` 的 `CaptionsOverlay.tsx`、`MascotCompanion.tsx` 與 `public/mascot/*.png` 到專案 `src/`／`public/mascot/`，專案自建 `captionContent.ts` 寫 `HIGHLIGHT_MAP`；用 `computeHighlightFrames()` 算出高光影格餵給 `MascotCompanion`。
- **掛載順序**：手繪背景 → 懸浮頭像 → 吉祥物 → 字幕。吉祥物要放在字幕元件之前，才不會被字幕蓋住。

## 7. BGM

使用者指定既有曲目（例如 YouTube 連結）時：

```bash
yt-dlp -x --audio-format m4a <url>
# loudnorm 正規化到約 -18 LUFS，-t 裁到與旁白等長
```

混音音量與首尾淡入淡出交給 Remotion 的 `volume` 曲線處理，**不要把淡入淡出烘進音檔本身**，方便之後調整。

下載前務必先確認授權／是否需要標註來源；使用者若明確表示免版權、不用標註，才可省略。
