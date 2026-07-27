# M8 · 日式節目製作方式（Remotion Program Graphics）

> 階段清單、關卡與注意事項見 [`../WORKFLOWS.md`](../WORKFLOWS.md)。這份只補長篇實作細節。

這是「純 Remotion」的進化製作方式。核心不是增加更多素材切鏡，而是把旁白中的人物、年份、地點、關係、數字與結論轉成可逐層揭示的視覺物件，形成具有固定識別、模組化資訊圖形與題材化轉場的節目型成片。

「日式節目」描述的是製作語法：清楚的節目識別、章節結構、高密度資訊編舞與持續的視覺回饋。**不代表每支影片都必須使用日文、和風紙張、墨水、寺院或日本歷史元素。** 美術風格必須依題材重新定義。

## 畫布與輸出比例

本方式不預設橫式或直式，可交付 16:9、9:16、1:1、4:5 或專案指定尺寸。

建立 composition profile，至少集中管理下列項目；**不要把 `1080×1920` 之類的座標散落硬寫在各元件**：

```ts
type CompositionProfile = {
  width: number;
  height: number;
  fps: number;
  aspect: 'landscape' | 'portrait' | 'square' | 'custom';
  safeArea: {top: number; right: number; bottom: number; left: number};
  captionZone: {top: number; bottom: number};
};
```

共用資料與動畫邏輯，為不同長寬比提供 layout variant：

- 橫式可左右分欄，同時保留較多關係資訊。
- 直式改為上下分區、分步揭示。
- **不能直接裁切橫式畫面充當直式。**

若使用者已指定交付平台或尺寸，直接依該規格設計；若尚未指定且比例會影響構圖，開始製作前須一併確認。

## 旁白驅動的資訊編舞

完成 `timeline-lock` 後，把每段旁白拆成 `beat`。每個 beat 不只指定場景，還要定義：

1. **這句要觀眾理解什麼**：事件、人物、時間、地點、數值、因果或結論。
2. **畫面中的主構圖**：人物關係、時間軸、地圖、比較表、流程、數據面板或引言。
3. **依序出現的資訊物件**：每次只新增一個清楚的理解步驟。
4. **揭示時間點**：優先對齊關鍵詞、語音停頓與字幕時間碼，不依平均字數估算。
5. **退出或狀態改變**：淡出、遮罩擦除、地圖填色、數字推進、關係斷裂、焦點轉移。

畫面可以維持同一主構圖數秒，但通常每 0.3–0.8 秒應有一個有意義的狀態變化。**不能為了保持動態而加入與內容無關的漂浮、彈跳或裝飾。**

## 固定節目模組

依內容選用，不要求每支影片全部出現：

| 模組 | 用途 |
| --- | --- |
| `ProgramIdent` | 固定節目 Logo／系列識別。社群短片通常控制在 0.5–1.5 秒，不能壓過 Hook |
| `HookCard` | 先呈現衝突、結果或疑問，再補節目識別 |
| `ChapterCard` | 章節名稱、時間與一句定位 |
| `CharacterCard` | 人物立繪、姓名、身分與關係線 |
| `Timeline` | 年份、日期、事件節點與時間推進 |
| `MapProgress` | 地圖區域填色、路線、勢力或百分比變化 |
| `DataCounter` | 數字、比例、排名及目標進度 |
| `CauseEffectDiagram` | 因果鏈、對立、合併、斷裂與焦點切換 |
| `SourceCard` | 資料來源、引言與必要註記 |
| `NarrationCaptions` | 本次確認的一般字幕或設計高光字幕 |

節目 Logo、章節標題、場內資訊標籤、資料註記和旁白字幕是**不同層級**，不得全部使用同一種字幕卡處理。**場內標籤不能取代完整旁白字幕。**

## 動畫與轉場語法

- 所有動態使用 `useCurrentFrame()`、`interpolate()`、`spring()`、`Sequence` 或其他可逐格求值的 Remotion API；禁止依賴 CSS transition／animation。
- 優先使用內容本身形成動畫：年份推進、地圖填色、關係線連接或斷裂、數字累進、遮罩揭示、鏡頭焦點移動。
- 轉場必須服務題材。歷史可用墨痕、紙張、印章或年代擦除；科技、商業與醫療應建立各自的線條、掃描、介面或資料轉場——**不要把「日式節目」誤解成固定和風素材包**。
- 一次主要只強調一個視覺焦點；進場順序依「主題 → 對象 → 關係／數據 → 結論」建立層級。
- 通用翻頁、縮放或滑動只能在符合節目視覺語法時使用，不把既有專案的轉場直接複製成新節目的預設。

## 建議程式結構

```text
production/<project>/src/
├── Composition.tsx
├── data/
│   └── programBeats.ts        # 內容、時間碼與模組狀態
├── layout/
│   ├── compositionProfiles.ts
│   └── resolveProgramLayout.ts
├── theme/
│   └── programTheme.ts
├── modules/
│   ├── ProgramIdent.tsx
│   ├── HookCard.tsx
│   ├── ChapterCard.tsx
│   ├── CharacterCard.tsx
│   ├── Timeline.tsx
│   ├── MapProgress.tsx
│   ├── DataCounter.tsx
│   └── CauseEffectDiagram.tsx
└── captions/
    └── NarrationCaptions.tsx
```

`programBeats.ts` 保存內容、時間碼與模組狀態；元件只負責畫面求值。**不要把逐字稿、時間、顏色、座標與動畫全部混寫在單一巨大 `Composition.tsx`。**

## 品質檢查

除了 `video-flow qa` 的自動項目之外：

- 先輸出節目識別、資訊最密集畫面、轉場中間幀及結尾畫面的**完整解析度 still**。
- 同一畫面檢查標題、資訊標籤、資料註記與字幕是否互相爭奪焦點。
- 驗證關鍵資訊的出現時間與旁白關鍵詞一致，數字、日期、地圖與人物關係沒有錯誤。
- **每個交付比例都要獨立做安全區與可讀性 QA**；通過一個比例不代表其他比例自動通過。
