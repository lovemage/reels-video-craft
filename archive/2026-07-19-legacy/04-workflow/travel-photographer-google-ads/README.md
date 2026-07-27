# 旅攝女孩四國行｜12 秒 Google Ads 專案

以附件角色為唯一主角，製作一支 12 秒、四國旅行主題的 `aw-esim.com` Google Ads 影片。成片不是旅遊景點拼貼，而是由同一位旅攝女孩、同一台相機與連續快門轉場串起的一段旅程。

## 專案定案

| 項目 | 決定 |
|---|---|
| 核心訊息 | 四國旅行，一張 eSIM 就夠 |
| 國家／場景 | 日本・京都伏見稻荷／韓國・首爾 N 首爾塔／泰國・清邁大象保育場景／美國・舊金山金門大橋 |
| 片長 | 12.0 秒 |
| 主畫幅 | 16:9，已交付 1280×720 測試母版 |
| 延伸畫幅 | 1:1 1080×1080、9:16 1080×1920 |
| 視覺風格 | 高質感日系水彩動畫、乾淨線稿、柔和紙張顆粒、自然旅行光線 |
| 共同鏡頭語言 | 僅京都從背包取機；各國角色現身 → 舉機鏡片遮幅 → 地標觀景窗 POV 對焦 → KATA → `aw-esim.com` 拍立得 |
| 品牌收尾 | `四國旅行，一張 eSIM 就夠`＋`aw-esim.com`＋`立即上網` |

## 正式製作方法

本專案不再以 Remotion 或靜態圖片推拉模擬人物動態。正式流程固定為：

1. 每個國家各自製作一支人物動態鏡頭。
2. 每支影片先生成「首幀圖」與「尾幀圖」。
3. 首幀與尾幀必須逐張交由使用者檢查；兩張都核准後，才能生成該國影片。
4. 生成模型只負責首尾幀之間的自然人物動作；不生成跨國轉場、照片牆、字幕或品牌 UI。
5. 四國實拍感動態素材使用 DaVinci Resolve 完成挑鏡、剪接、轉場、音效、調色與最終合成。
6. Remotion 只保留給可複用片尾、精準字幕、不同語言及 16:9／1:1／9:16 批量改版。

任何未列為 `APPROVED` 的圖片都不得送入影片生成。核准狀態記錄於 [frame-approval.md](frame-approval.md)。

## 內容索引

| 檔案 | 用途 |
|---|---|
| [video-plan.md](video-plan.md) | 創意策略、逐秒分鏡、轉場與聲音 |
| [camera-detail-plan.md](camera-detail-plan.md) | 背包取機、轉盤、對焦、快門的微距鏡位與聲音設計 |
| [character-bible.md](character-bible.md) | 角色固定特徵與生成禁則 |
| [google-ads-plan.md](google-ads-plan.md) | Google Ads 規格、輸出矩陣與投放建議 |
| [campaign-copy.md](campaign-copy.md) | 影片疊字與廣告後台文案 |
| [runbook.md](runbook.md) | 生圖、生片、剪輯、輸出的實作順序 |
| [frame-approval.md](frame-approval.md) | 八張首尾幀的逐張核准紀錄與生片閘門 |
| [qa-checklist.md](qa-checklist.md) | 角色、地標、動物福利、廣告與技術驗收 |
| [render-local-12s.sh](render-local-12s.sh) | 不外傳素材的本機 12 秒合成、聲音、轉場與品牌字卡 |
| [references/](references/) | 使用者提供的角色主視覺與設定表 |
| [prompts/](prompts/) | 四格故事板、12 格細節 shotboard、四張 keyframe、四段影片與單段 12 秒 prompt |

## 目前狀態

- 舊版四國 12 秒合成僅保留為問題參考，不再作為正式母版。
- 新版流程已改為四國各自生成完整人物動態，並採八張首尾幀逐張核准。
- 下一步：依 [frame-approval.md](frame-approval.md) 從京都首幀開始逐張確認。
- 八張首尾幀未全部完成前，不進行四國最終剪輯。
- 正式生成前，先確認 `aw-esim.com` 的日本、韓國、泰國、美國方案與文案承諾均真實可用。
