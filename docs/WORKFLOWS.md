<!-- 這份文件由 `video-flow docs` 從 flow/registry/*.json 生成。不要手改，改 registry。 -->

# 影片製作流程

共 8 套製作方式、14 個標準階段。沒有預設方式——每個新專案都必須由使用者本次逐題確認。

```bash
npx video-flow intake            # 逐題確認 → 產出 brief.json
npx video-flow plan <project>    # 印出這支片該跑哪些階段、下一步是什麼
npx video-flow done <project> <stage> --approved-by "使用者"
npx video-flow qa <project> out/final.mp4
```

## 階段矩陣

圖例：● 必要　◆ 鎖定（由上游技能決定，不可自訂）　○ 選用　· 不需要

| 階段 | 關卡 | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| 需求確認 | ⏸ 人工 | ● | ● | ● | ● | ● | ● | ● | ● |
| 素材歸位 |  | ● | ● | ● | ● | ● | ● | ● | ● |
| 口播剪輯（auto-editor first pass） | ⏸ 人工 | ● | ● | · | ● | ● | ● | ● | ● |
| 語音轉錄 |  | ● | ● | · | ● | ● | ● | ● | ● |
| 字幕校對 | ⏸ 人工 | ● | ● | · | ● | ● | ● | ● | ● |
| 時間軸鎖定 |  | ● | ● | · | ● | ● | ● | ● | ● |
| 分鏡規劃 | ⏸ 人工 | ○ | ● | · | ● | ● | ● | ○ | ● |
| 視覺風格定案 | ⏸ 人工 | ○ | ● | ● | ◆ | ◆ | ● | ● | ● |
| 素材生成 | ⏸ 人工 | · | ● | ● | ● | ● | ● | · | ○ |
| 旁白時間對齊 |  | · | ● | · | ● | ● | ● | ● | ● |
| 組裝 |  | ● | ● | ○ | ● | ● | ● | ● | ● |
| 渲染 |  | ● | ● | ● | ● | ● | ● | ● | ● |
| 品質檢查 | ⏸ 人工 | ● | ● | ● | ● | ● | ● | ● | ● |
| 交付 |  | ● | ● | ● | ● | ● | ● | ● | ● |

對照表：

| 代號 | 製作方式 |
| --- | --- |
| M1 | 純 Remotion |
| M2 | GBRO 拼貼 + Omni + Remotion |
| M3 | Gemini Omni 直接影片編輯 |
| M4 | 手繪日記漫畫 + 真人懸浮頭像 |
| M5 | 手繪故事線稿上色 |
| M6 | Seedance 2.0 Fast（OpenRouter）+ Remotion |
| M7 | HyperFrames + Remotion |
| M8 | 日式節目製作方式（Remotion Program Graphics） |

### 快速判讀

- **需要寫分鏡**：M2、M4、M5、M6、M8　·　選用：M1、M7　·　不需要：M3
- **需要先對齊口播時間**：M2、M4、M5、M6、M7、M8　·　不需要：M1、M3
- **需要先剪掉口播多餘段落（auto-editor）**：M1、M2、M4、M5、M6、M7、M8　·　不需要：M3
- **需要呼叫付費生成 API**：M2、M3、M4、M5、M6　·　不需要：M1、M7
- **視覺風格由上游技能鎖定、不可自訂**：M4、M5

## 輸入素材 × 交付比例

intake 會用這兩題先篩掉不適用的方式，再讓你選。

| 製作方式 | 吃哪些輸入 | 支援比例 | 預設 | 畫面來源 | 成本 |
| --- | --- | --- | --- | --- | --- |
| M1 純 Remotion | 口播影片（有人臉）<br>純旁白音檔<br>逐字稿／文字<br>只有主題／需求 | 9:16 16:9 1:1 4:5 custom | 9:16 | 程式繪製 | 無 |
| M2 GBRO 拼貼 + Omni + Remotion | 口播影片（有人臉）<br>純旁白音檔<br>逐字稿／文字<br>只有主題／需求 | 9:16 1:1 4:5 16:9 | 9:16 | AI 生成 | 按素材 |
| M3 Gemini Omni 直接影片編輯 | 既有短鏡頭（要修改的素材） | source | source | 既有影片 | 按鏡頭 |
| M4 手繪日記漫畫 + 真人懸浮頭像 | 口播影片（有人臉）<br>純旁白音檔<br>逐字稿／文字<br>順序圖片 | 9:16 3:4 | 9:16 | AI 生成 | 按張 |
| M5 手繪故事線稿上色 | 口播影片（有人臉）<br>純旁白音檔<br>逐字稿／文字<br>只有主題／需求 | 9:16 3:4 | 9:16 | AI 生成 | 按張 |
| M6 Seedance 2.0 Fast（OpenRouter）+ Remotion | 口播影片（有人臉）<br>純旁白音檔<br>逐字稿／文字<br>只有主題／需求<br>順序圖片 | 9:16 16:9 1:1 | 9:16 | AI 生成 | 按秒 |
| M7 HyperFrames + Remotion | 口播影片（有人臉）<br>純旁白音檔<br>逐字稿／文字<br>只有主題／需求 | 9:16 16:9 1:1 4:5 custom | 9:16 | 程式繪製 | 無 |
| M8 日式節目製作方式（Remotion Program Graphics） | 口播影片（有人臉）<br>純旁白音檔<br>逐字稿／文字<br>只有主題／需求 | 9:16 16:9 1:1 4:5 custom | 16:9 | 程式繪製 | 無 |

## 階段定義

### 規劃

#### 需求確認 `intake`

逐題確認輸入素材、觀看情境／比例、製作方式、配音、字幕、BGM 與片長，產出 brief.json。

> **⏸ 人工確認關卡**：使用者必須對每一題給出明確答案。「你決定」「都可以」視為未確認：可提出具體建議，但仍須使用者表態。未全部確認前不得生成素材或呼叫付費 API。

- 產出：`brief.json`
- 指令：`video-flow intake`

### 口播前處理

#### 素材歸位 `source-prep`

把使用者提供的口播影片／音檔／逐字稿複製進專案標準路徑，轉成穩定格式，原始檔永久保留。

- 產出：`public/voiceover-raw.*`、`SCRIPT.zh-TW.md`
- 規則：原始檔一律命名 voiceover-raw.*，永不覆寫。
- 規則：影片來源同時保留 voiceover-raw.mp4（供懸浮頭像使用）與抽出的 voiceover-raw.wav。

#### 口播剪輯（auto-editor first pass） `speech-edit`

用 auto-editor 移除靜音段、冗長停頓與多餘空白，產出 voiceover-edited.*。這是整支影片時間軸的唯一基準。

> **⏸ 人工確認關卡**：先跑 --preview 讓使用者確認擬移除的段落沒有誤切，再正式 render。若口語停頓被切太緊，調大 --margin 重跑。

- 輸入：`public/voiceover-raw.*`
- 產出：`public/voiceover-edited.*`
- 工具：auto-editor
- 指令：`auto-editor public/voiceover-raw.wav --preview`
- 規則：不得跳過此步驟直接量秒、做字幕或排分鏡。
- 規則：不得覆寫 raw 檔。
- 規則：後續所有時間計算（字幕時間碼、場景切點、durationInFrames、交付的獨立旁白）一律以 edited 檔為準。

#### 語音轉錄 `transcribe`

把 voiceover-edited.* 轉錄成帶時間碼的字幕初稿。

- 輸入：`public/voiceover-edited.*`
- 產出：`public/captions/captions-draft.json`
- 工具：whisper

#### 字幕校對 `caption-correct`

回聽原音校對初稿：移除重複、口語贅詞與多餘空白，修正聽錯字與不自然斷句。

> **⏸ 人工確認關卡**

- 輸入：`public/captions/captions-draft.json`
- 產出：`public/captions/captions.json`
- 規則：只清理字幕呈現，不得改寫原意或杜撰內容。
- 規則：字幕刪字不等於刪語音；不得因為校對而剪掉音訊。
- 規則：格式須符合 @remotion/captions：text、startMs、endMs、timestampMs、confidence。

#### 時間軸鎖定 `timeline-lock`

以校正後字幕與 edited 旁白實際秒數算出總幀數與場景切點，寫回 brief.json。之後視覺一律配合這個時間軸。

- 輸入：`public/captions/captions.json`、`public/voiceover-edited.*`
- 產出：`brief.json#timeline`
- 規則：換頁與場景切點對齊語音停頓，不平均分配。
- 規則：不得先固定畫面時間再拉伸語音。

### 視覺設計

#### 分鏡規劃 `storyboard`

把鎖定後的時間軸拆成鏡頭／幕／beat，寫明每一段要讓觀眾理解什麼、畫面主構圖與揭示順序。

> **⏸ 人工確認關卡**

- 輸入：`brief.json#timeline`、`public/captions/captions.json`
- 產出：`STORYBOARD.zh-TW.md`

#### 視覺風格定案 `visual-design`

定案色彩、字型、構圖語法、角色與轉場語彙。部分方式的風格由技能自身鎖定，不得自行改寫。

> **⏸ 人工確認關卡**

- 產出：`DESIGN.zh-TW.md`

### 素材與組裝

#### 素材生成 `asset-gen`

呼叫生圖／生影片 API 產出畫面素材，先出單鏡測試取得確認，再批量生成。

> **⏸ 人工確認關卡**：涉及付費 API。必須先產單一鏡頭或 contact sheet 供使用者確認，再批量生成。

- 產出：`public/assets/**`

#### 旁白時間對齊 `script-align`

外部工具估的分鏡秒數只是草稿。用每段敘述文字去 fuzzy match captions.json 的真實時間戳，換算出正確的起訖影格。

- 輸入：`public/captions/captions.json`、`STORYBOARD.zh-TW.md`
- 產出：`src/data/segments.ts`
- 規則：字元級 fuzzy match，並用單調游標往前搜尋，避免同一個詞在文本別處被誤配。
- 規則：漏掉這一步，畫面切換節奏會跟語音完全對不上。

#### 組裝 `assemble`

在 Remotion 把畫面軌、旁白、字幕、吉祥物／頭像與 BGM 疊成最終時間軸。

- 產出：`src/Composition.tsx`
- 規則：所有動畫用 useCurrentFrame()／interpolate()／spring()，不使用 CSS transition／animation。
- 規則：旁白是主聲道；BGM 約 8–15%，首秒淡入、末兩秒淡出。
- 規則：掛載順序：畫面軌 → 懸浮頭像 → 吉祥物 → 字幕（吉祥物在字幕之前才不會被蓋住）。

#### 渲染 `render`

先 lint 再渲染，輸出檔名標示版本、聲線與是否含 BGM，不覆蓋既有成品。

- 產出：`out/*.mp4`

### 驗證

#### 品質檢查 `qa`

自動檢查尺寸、fps、codec、片長、音訊峰值；人工檢查字幕同步、安全區與資訊正確性。

> **⏸ 人工確認關卡**

- 產出：`qa-report.json`
- 指令：`video-flow qa <project> <output.mp4>`
- 規則：音訊峰值必須低於 0 dB。
- 規則：影片長度須覆蓋完整旁白，不截尾音。
- 規則：每個交付比例都要獨立做安全區與可讀性 QA，通過一個比例不代表其他比例自動通過。

### 交付

#### 交付 `deliver`

提供完整影片、獨立旁白與腳本的絕對路徑，附上素材來源與授權註記。

- 產出：`out/*.mp4`、`CREDITS.md`

## 各製作方式

### M1 · 純 Remotion

程式繪圖、SVG／CSS 動畫、字幕與轉場，全部由程式碼產生。

**適合**：資訊圖表、文字卡、需要精準時間控制的影片

**優點**

- 時間與版面最可控
- 零素材生成成本
- 改一個字重渲即可

**注意**

- 視覺完全靠程式設計，畫面豐富度取決於實作
- 不適合需要寫實質感的題材

**需要**：工具 node>=22、ffmpeg

**成本**：除 TTS 外無 API 成本。

流程：

- ● **需求確認** ⏸
- ● **素材歸位**
- ● **口播剪輯（auto-editor first pass）** ⏸
- ● **語音轉錄**
- ● **字幕校對** ⏸
- ● **時間軸鎖定**
- ○ **分鏡規劃** ⏸ — 畫面直接在 Composition 排；超過三個場景才建議先寫分鏡。
- ○ **視覺風格定案** ⏸
- · ~~素材生成~~ — 不需要——畫面由程式繪製。
- · ~~旁白時間對齊~~ — 不需要——場景區間直接讀 captions.json 算，沒有外部工具估的秒數要校正。
- ● **組裝**
- ● **渲染**
- ● **品質檢查** ⏸
- ● **交付**

### M2 · GBRO 拼貼 + Omni + Remotion

先做半調紙拼貼靜幀，用 Gemini Omni 生成 3–5 秒短動畫，再由 Remotion 對齊旁白組裝。

> 長篇實作細節：[`docs/methods/gbro-collage.md`](methods/gbro-collage.md)

**適合**：科普、觀點內容、Reels、紙拼貼敘事

**優點**

- 兼顧生圖質感與精準剪輯
- 視覺辨識度高

**注意**

- 必須完成視覺隱喻、靜幀、動畫三階段審批，不可跳關
- 生圖與生影片皆為付費 API

**需要**：工具 node>=22、ffmpeg　·　環境變數 GEMINI_API_KEY　·　skill gbro-collage-broll

**成本**：每段一張靜幀 + 一支短動畫。

**比例**：改比例必須重新生成靜幀，不可裁切既有素材。

流程：

- ● **需求確認** ⏸
- ● **素材歸位**
- ● **口播剪輯（auto-editor first pass）** ⏸
- ● **語音轉錄**
- ● **字幕校對** ⏸
- ● **時間軸鎖定**
- ● **分鏡規劃** ⏸ — 每段約 5 秒的視覺隱喻，先提出等待確認才進下一階段。
- ● **視覺風格定案** ⏸ — 三階段審批第 2 關：生成彩色半調紙拼貼靜幀 + contact sheet，再次等待確認。
- ● **素材生成** ⏸ — 三階段審批第 3 關：Gemini Omni 生成短動畫，逐段 QA 後才放進 Remotion。每段保存 frames/first-frame.png、frames/last-frame.png、omni-prompt.txt、omni/run-v01/final-5s.mp4、contact-sheet.jpg。
- ● **旁白時間對齊** — 短動畫長度是固定的 3–5 秒，必須對齊旁白段落；不足整段長度時在尾幀停留，不要慢速拉伸。
- ● **組裝**
- ● **渲染**
- ● **品質檢查** ⏸
- ● **交付**

### M3 · Gemini Omni 直接影片編輯

上傳既有短鏡頭，用自然語言修改物件、背景、燈光或風格。

**適合**：修改既有短鏡頭、替換背景或物件、統一多支素材的風格

**優點**

- 可用自然語言反覆修改
- 不需重新生成整段

**注意**

- 視為 Preview 能力，不等同可獨立編輯圖層的剪輯器
- 不適合一次處理完整長片，長片應先拆鏡頭
- 這是鏡頭級工具，通常作為其他方式的子步驟而非獨立交付流程

**需要**：工具 ffmpeg　·　環境變數 GEMINI_API_KEY

**比例**：沿用來源鏡頭比例。

流程：

- ● **需求確認** ⏸
- ● **素材歸位**
- · ~~口播剪輯（auto-editor first pass）~~ — 不需要——輸入是既有畫面素材，不是口播。若這支鏡頭最終要進一支有旁白的片，語音流程屬於那支片的方式，不屬於這裡。
- · ~~語音轉錄~~
- · ~~字幕校對~~
- · ~~時間軸鎖定~~ — 不需要——沒有旁白時間軸要鎖。
- · ~~分鏡規劃~~ — 不需要——鏡頭已經存在，只做修改指令。
- ● **視覺風格定案** ⏸
- ● **素材生成** ⏸
- · ~~旁白時間對齊~~
- ○ **組裝** — 單鏡輸出時不需要；若要接進完整影片，由主流程的 Remotion 組裝。
- ● **渲染**
- ● **品質檢查** ⏸
- ● **交付**

### M4 · 手繪日記漫畫 + 真人懸浮頭像

把故事轉成「文字 → 黑白畫稿 → 彩色插畫」的手繪動畫，右上角放真人懸浮頭像。

> 長篇實作細節：[`docs/methods/handdrawn-diary.md`](methods/handdrawn-diary.md)

**適合**：接案心法、個人觀點、教學類 talking-head 短影音

**優點**

- 美術風格由技能既有設計語言直接鎖定，不必自行設計
- 真人只需露臉入鏡當懸浮頭像

**注意**

- 步驟最多：需故事文本整理、時間點比對校正、額外裝字幕與吉祥物元件
- 禁止自行編寫美術風格提示詞，也不得沿用其他專案的視覺系統
- 禁止直接沿用技能內建的 text → bw_full → color 揭示動畫與手寫字幕（會跟本專案字幕／頭像疊在一起）

**需要**：工具 node>=22、python3、ffmpeg　·　skill story-to-handdrawn-video　·　submodule shared/story-to-handdrawn-video

**成本**：每幕一張圖，由 Codex Image2 生成。plan 階段免費不生圖。

**比例**：Seedance 預設原生 9:16（1080×1920），插畫區加高並保留安全白邊，不以裁切或補黑邊處理。

**輸入**：懸浮頭像需要真人入鏡影片；沒有的話這套方式只剩手繪畫面軌。

流程：

- ● **需求確認** ⏸
- ● **素材歸位**
- ● **口播剪輯（auto-editor first pass）** ⏸
- ● **語音轉錄**
- ● **字幕校對** ⏸
- ● **時間軸鎖定**
- ● **分鏡規劃** ⏸ — 由技能腳本以 --mode plan 自動產出（免費、不生圖）。先把校正後逐字稿改寫成故事文本，長句要先斷句——技能依標點自動分句，句子太長會在中間硬切甚至切斷詞。
- ◆ **視覺風格定案** ⏸ — 鎖定，不可改：純白底、氈頭筆黑線、局部蠟筆色、大量留白，由技能自己的 DESIGN.md 決定。
- ● **素材生成** ⏸ — prompt 在 prompts/generated/codex/<batch>/，交給 Codex Image2 生成；助手只需準備 prompt。全部生成後跑 --mode import（本地衍生黑白稿並對齊畫布）與 --mode render。
- ● **旁白時間對齊** — 本方式的關鍵步驟。技能估的 duration_sec 只是粗略節奏，必須用每段 narration 文字比對 captions.json 真實時間戳（字元級 fuzzy match + 單調游標），算出真正的 from/to frame。漏掉這步，畫面切換會跟語音完全對不上。
- ● **組裝** — 用 <Img> 逐段讀 storyboard/stills/NN.png 包進 Sequence，加慢速 Ken Burns。真人影片當右上角圓形頭像靜音播放，旁白走獨立 <Audio>。字幕與吉祥物用 shared/subtitle-mascot-kit。
- ● **渲染**
- ● **品質檢查** ⏸
- ● **交付**

### M5 · 手繪故事線稿上色

每幕一張彩色母圖，本地提取對齊線稿，做「線稿由左至右顯現 → 同方向低飽和彩色填入」。

**適合**：7–9 幕、35–45 秒的暖故事型 B-roll

**優點**

- 揭示動畫本身就是敘事節奏
- 單張母圖即可衍生線稿與彩色兩層

**注意**

- 只產出畫面軌，字幕與音訊仍交由 Remotion
- 上游預設 720×960，交付 9:16 必須先在分鏡與安全區調整到 1080×1920 再生成素材
- 禁止使用其內建故事字幕覆蓋本專案字幕設計

**需要**：工具 node>=22、ffmpeg、hyperframes　·　skill handdraw-story-video

**成本**：每幕一張彩色母圖。

**比例**：上游原生 3:4（720×960）；交付 9:16 須先調整分鏡與畫布安全區。

流程：

- ● **需求確認** ⏸
- ● **素材歸位**
- ● **口播剪輯（auto-editor first pass）** ⏸
- ● **語音轉錄**
- ● **字幕校對** ⏸
- ● **時間軸鎖定**
- ● **分鏡規劃** ⏸ — 7–9 幕，每幕對應一張彩色母圖。幕數與旁白段落要先對齊再生圖。
- ◆ **視覺風格定案** ⏸ — 揭示語法鎖定：線稿由左至右顯現，彩色同方向低飽和填入。
- ● **素材生成** ⏸
- ● **旁白時間對齊** — HyperFrames 段落秒數必須以 captions.json 校正，不用技能預設節奏。
- ● **組裝**
- ● **渲染**
- ● **品質檢查** ⏸
- ● **交付**

### M6 · Seedance 2.0 Fast（OpenRouter）+ Remotion

用 OpenRouter 非同步影片端點生成 B-roll，支援文字轉影片、首尾幀控制與多模態參考素材。

> 長篇實作細節：[`docs/methods/seedance-broll.md`](methods/seedance-broll.md)

**適合**：需要快速生成寫實或動態 B-roll、首尾幀接續的連續鏡頭、有參考素材要延伸

**優點**

- 每秒成本相對可控
- 可非同步批量生成
- 首尾幀接續可做連貫長鏡

**注意**

- 必須從 .env 讀 OPENROUTER_API_KEY，不得透過 chat completions 偽造影片呼叫
- 提交後要輪詢 job 完成狀態再下載 MP4
- 價格、支援長度與解析度以當下 models API 回傳為準

**需要**：工具 node>=22、python3、ffmpeg　·　環境變數 OPENROUTER_API_KEY

**成本**：OpenRouter 公開起價約 US$0.0538／秒（僅供估算，以當下 models API 為準）。

**比例**：預設 9:16、720p、4–8 秒短鏡頭。

流程：

- ● **需求確認** ⏸
- ● **素材歸位**
- ● **口播剪輯（auto-editor first pass）** ⏸
- ● **語音轉錄**
- ● **字幕校對** ⏸
- ● **時間軸鎖定**
- ● **分鏡規劃** ⏸ — 每個 Cut 要有 prompt 與 continuity contract；連續鏡頭用上一段尾幀當下一段首幀。
- ● **視覺風格定案** ⏸ — 先做 Character Sheet 鎖定人物與場景，否則跨鏡頭不連貫。
- ● **素材生成** ⏸ — 先出單鏡頭測試並取得使用者確認，再批量生成。每段產出 contact sheet 供人工檢查，並留下可比對的 render record。
- ● **旁白時間對齊**
- ● **組裝**
- ● **渲染**
- ● **品質檢查** ⏸
- ● **交付**

### M7 · HyperFrames + Remotion

用 HTML／CSS／GSAP（可含 Lottie、Three.js）建立可逐格定位的動態網頁畫面，由 Headless Chrome 與 FFmpeg 輸出畫面軌。

**適合**：動態排版、網頁感轉場、資訊視覺化、精準線條／遮罩揭示

**優點**

- 瀏覽器即所見即所得，預覽快
- 可用整個網頁生態的動畫工具

**注意**

- 需 Node.js 22+、FFmpeg 與 HyperFrames
- 只負責視覺片段；旁白、字幕、吉祥物、頭像、配樂與最終時間軸仍由 Remotion 組裝
- 不可因為 handdraw-story-video 用 HyperFrames 就自動選這套

**需要**：工具 node>=22、ffmpeg、hyperframes　·　skill hyperframes

流程：

- ● **需求確認** ⏸
- ● **素材歸位**
- ● **口播剪輯（auto-editor first pass）** ⏸
- ● **語音轉錄**
- ● **字幕校對** ⏸
- ● **時間軸鎖定**
- ○ **分鏡規劃** ⏸
- ● **視覺風格定案** ⏸
- · ~~素材生成~~ — 不需要——畫面由 HTML/CSS/GSAP 產生。
- ● **旁白時間對齊** — HyperFrames 片段的長度必須依 captions.json 訂，不能先做完動畫再硬塞。
- ● **組裝**
- ● **渲染**
- ● **品質檢查** ⏸
- ● **交付**

### M8 · 日式節目製作方式（Remotion Program Graphics）

純 Remotion 的進化版：節目識別 → 章節卡 → 在同一主構圖內逐層揭示人物、關係、年份、地圖、數值與結論。

> 長篇實作細節：[`docs/methods/program-graphics.md`](methods/program-graphics.md)

**適合**：歷史、科普、商業、事件解析、系列型內容

**優點**

- 同一構圖連續揭示，資訊密度高
- 節目識別與模組可跨集重用
- 時間控制精準

**注意**

- 「日式節目」指的是節目化資訊設計方法，不要求套用日本文化視覺；美術風格必須依題材重新定義
- 不得把座標與安全區綁死在單一比例，須用 composition profile 與 layout variant
- 章節標題、場內資訊標籤與旁白字幕必須分層設計，場內標籤不能取代完整旁白字幕

**需要**：工具 node>=22、ffmpeg

**比例**：本方式不限橫直式；各比例共用內容資料與動畫邏輯，但必須有獨立 layout variant 及安全區 QA。

流程：

- ● **需求確認** ⏸
- ● **素材歸位**
- ● **口播剪輯（auto-editor first pass）** ⏸
- ● **語音轉錄**
- ● **字幕校對** ⏸
- ● **時間軸鎖定**
- ● **Beat sheet 規劃** ⏸ — 本方式的分鏡是 beat sheet，不是逐鏡分鏡表。每個 beat 要定義：① 這句要觀眾理解什麼 ② 畫面主構圖 ③ 依序出現的資訊物件（每次只新增一個理解步驟）④ 揭示時間點 ⑤ 退出或狀態改變。畫面可維持同一構圖數秒，但通常每 0.3–0.8 秒要有一個有意義的狀態變化。
- ● **視覺風格定案** ⏸ — 建立 composition profile（width/height/fps/safeArea/captionZone）與題材化轉場語法。可選模組：ProgramIdent、HookCard、ChapterCard、CharacterCard、Timeline、MapProgress、DataCounter、CauseEffectDiagram、SourceCard、NarrationCaptions。
- ○ **素材生成** ⏸ — 多數情況不需要；只有需要人物立繪或地圖底圖時才生成。
- ● **關鍵詞揭示對時** — 本方式沒有外部工具估算的秒數要校正，因此不做 fuzzy match。改為：在 captions.json 裡定位每個 beat 的觸發關鍵詞（人名、年份、地名、數值）與語音停頓，取該詞的 startMs 當揭示影格。
- ● **組裝** — 用 compositionProfile 驅動座標，禁止硬寫單一比例的數值。章節標題、場內資訊標籤、資料註記與旁白字幕分層掛載，場內標籤不得取代完整旁白字幕。
- ● **渲染**
- ● **品質檢查** ⏸ — 先輸出節目識別、資訊最密集畫面、轉場中間幀與結尾畫面的完整解析度 still，檢查標題、資訊標籤、資料註記與字幕是否互相爭奪焦點。
- ● **交付**

## Intake 問答

- 逐題等待明確答案，不得替未回答的題目假設預設值。
- 使用者一次只答部分題目時，只追問還沒確認的項目。
- 「你決定」「都可以」「隨便」視為尚未確認：可提出一個具體建議，但仍須使用者對該建議表態。
- 全部確認前只能整理需求與選項，不得生成素材、呼叫付費 API 或開始渲染。

1. **專案代號（英數與 -，用作資料夾名稱）** `project`
2. **你這次提供的原始素材是什麼？** `input`
   - 這題決定要不要跑 auto-editor 口播剪輯與轉錄，也會篩掉不吃這種輸入的製作方式。
3. **這支片主要在哪裡被看到？** `aspect`
   - 手機直式與電腦橫式會篩掉不同的製作方式；例如手繪類目前只支援直式。
4. **要用哪一套製作方式？** `method`
   - 選項已依前兩題過濾。若想用被篩掉的方式，要先改輸入或比例。
5. **配音要使用哪一種？** `voice`
   - 若該方式不跑 `speech-edit` 階段則跳過
   - 使用者提供的真人錄音
   - AI TTS
6. **字幕要使用哪一種？** `captions`
   - 若該方式不跑 `caption-correct` 階段則跳過
   - 一般清楚字幕 — 仍須以本次交付尺寸做完整解析度畫格可讀性 QA。
   - 設計高光字幕 — 必須沿用或建立本專案已確認的字型、色彩、描邊、版位與高光邏輯。沒有既有設計時，先提出字幕視覺稿並取得確認才可實作。不得以共用 kit、預設 TikTok 字幕或一般底卡字幕冒充。
7. **要不要加吉祥物／角色動畫？** `mascot`
   - 不加
   - 沿用 subtitle-mascot-kit 的角色 — 站位座標必須配合本專案字幕版位重新確認，不得直接沿用通用座標。
   - 本專案自製角色
8. **是否使用背景音樂？** `bgm`
   - 不使用
   - 使用我提供的曲目／音檔
   - 從已確認可用的音樂庫挑選 — 音樂庫路徑在 flow.config.json 的 assets.bgmLibrary；選定後直接隨機取一首，無須逐首確認。
9. **目標片長（秒；Reels 建議 60 秒內，可填「依旁白」）** `duration`

