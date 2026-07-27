# Google Ads 規格與投放規劃

## 建議投放組合

主資產採 12 秒 9:16，優先用於 YouTube Shorts／Demand Gen；同步輸出 1:1 與 16:9，讓同一個廣告群組覆蓋 Shorts、in-feed 與 in-stream。Google 官方目前建議影片活動使用 16:9、9:16、1:1 的 Full HD 素材；Video Action 類素材建議至少 10 秒，因此 12 秒符合本案用途。

## 交付矩陣

| 用途 | 畫幅 | 交付尺寸 | 片長 | 備註 |
|---|---:|---:|---:|---|
| Shorts 主版 | 9:16 | 1080×1920 | 12.0s | 角色與品牌訊息不得貼近右側／底部 UI |
| Demand Gen 方形 | 1:1 | 1080×1080 | 12.0s | 重新排版，不直接粗暴裁切主版 |
| YouTube 橫式 | 16:9 | 1920×1080 | 12.0s | 地標可放大，字幕保持中央安全區 |
| 縮圖 | 16:9 | 1280×720 | 靜態 | 京都鳥居＋角色＋單一主標 |

## 專案內部安全區

以下為保守工作區，正式上線仍須以 Google Ads 內建預覽逐版確認：

- 9:16：重要文字距左至少 90 px、距右至少 180 px、距頂至少 160 px、距底至少 320 px。
- 品牌主張最多兩行；國家標籤最多一行；任何時刻不堆疊三個可讀文字區。
- 角色臉部、相機與地標不可落在最右側操作列或底部 CTA 覆蓋區。
- Shorts 可立即被滑走，0.35 秒內必須出現人物、旅行環境與明確動勢。

## 技術交付

- MP4／H.264、30 fps、AAC 48 kHz；無黑邊、無剪輯時間碼、無模型水印。
- 最終母版 12.0 秒；響度以約 -14 LUFS integrated 為製作目標，true peak 不高於 -1 dBTP。
- Seedance 720p 生成素材若作正式廣告，先做細節修復與高品質放大，再輸出 Full HD；不能只改 metadata 假升級。
- AI 生圖內不放文字；所有國家標籤、品牌、網址與 CTA 以真實字體後製。

## Google Ads 後台資產

- Business name：`aw-esim.com`
- Headline：`四國旅行，一張 eSIM 就夠`
- Long headline：`日本、韓國、泰國、美國，一落地就能上網`
- CTA：`立即購買` 或 `瞭解詳情`
- Final URL：上線前填入可追蹤的實際落地頁與 UTM。

## 官方依據（2026-07-17 查核）

- [Google Ads：Video ads specs and format requirements](https://support.google.com/google-ads/answer/17091270?hl=en)
- [Google Ads：Demand Gen campaigns specs and format requirements](https://support.google.com/google-ads/answer/17091672?hl=en)
- [Google Ads：YouTube Shorts ads asset specs and best practices](https://support.google.com/google-ads/answer/16041697?hl=en)

Google 官方也提醒 AI 生成或編輯素材可能需要揭露／標示；發布前應依投放地區法規與 Google Ads 當下提供的 AI label 設定逐一確認。

