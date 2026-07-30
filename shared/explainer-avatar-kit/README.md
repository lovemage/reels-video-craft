# Tech Guy Explainer Avatar Kit

以使用者提供的角色圖為身份與畫風基準，製作的通用二次元說明人物素材。

## 內容

- `boards/tech-guy-avatar-board-v1.png`：核准的角色總覽板。
- `expressions/`：8 張透明背景胸像表情。
- `mouths/`：6 張透明背景嘴型模組。**注意：這是寫實光澤唇，與本角色的漫畫線稿臉不同畫風。** 線稿風格的用法見 `rigs/hyperframes-presenter/`。
- `gestures/`：8 張透明背景上半身手勢。
- `raw/`：去背前的純綠背景來源，保留作為後續修邊與重新輸出的依據。
- `manifest.json`：程式可讀的素材名稱、用途清單與已註冊的 rig。
- `rigs/`：已驗證的組裝方式。目前有 `hyperframes-presenter`（雙景別、線稿嘴型、音量驅動）。
- `tools/`：嘴部錨點校正與嘴型軌產生工具。

## 使用原則

- 表情與手勢是完整角色圖層；同一時間擇一顯示，不互相疊加。
- 嘴型是獨立 overlay，中心點固定，可依音訊強度或字幕時間切換。
- Remotion 內以 `staticFile()` 讀取時，需先將選用素材複製到該 production 專案的 `public/avatar/`。
- 每支影片仍需確認角色是否啟用、站位、縮放及安全區，不直接沿用舊專案座標。
- 此角色素材的原始參考圖由使用者提供；對外發布前需由使用者確認原圖與衍生素材的使用權。

## 建議嘴型對應

適用於**畫風相符**的角色。本 kit 的 tech-guy 是線稿臉，直接貼這組會外貼感明顯，
且蓋不掉角色原生的嘴 —— 改用 `rigs/hyperframes-presenter/` 的線稿嘴型。

| 音量／狀態 | 嘴型 |
| --- | --- |
| 靜音 | `01-closed-rest.png` |
| 很小 | `02-small-open.png` |
| 一般 | `03-medium-open.png` |
| 強調 | `04-wide-open.png` |
| O／圓唇音 | `05-rounded-o.png` |
| 正向語氣 | `06-smiling-speak.png` |

## 表情使用時機

| 表情 | 使用時機 |
| --- | --- |
| `neutral-attentive` | 一般說明、等待下一個重點；預設狀態 |
| `friendly-smile` | 開場招呼、低強度正向內容 |
| `cheerful-laugh` | 明確的好消息、幽默或完成感；不可頻繁使用 |
| `surprised` | 反常識數據、意外結果、重大轉折 |
| `puzzled-thinking` | 提出問題、比較選項、尚未下結論 |
| `serious-explaining` | 風險、限制、重要步驟與精確說明 |
| `worried-concerned` | 錯誤示範、警告、可能損失 |
| `confident-encouraging` | 結論、解法、CTA 與鼓勵執行 |

## 手勢使用時機

| 手勢 | 使用時機 |
| --- | --- |
| `point-left`／`point-right` | 畫面該方向確實有對應卡片、數字或畫面時 |
| `present-open-palm` | 引入單一概念、產品或步驟 |
| `explain-both-palms` | 比較兩方、總覽多個選項 |
| `thinking-chin` | 問題句、思考停頓、權衡 |
| `thumbs-up` | 已完成、已驗證或明確推薦 |
| `important-tip` | 唯一重點、規則、注意事項 |
| `tech-demo` | 操作工具、軟體、API 或實作步驟 |

## 自然呈現規則

- 80% 時間維持 `neutral-attentive` 或輕微微笑，表情是語意標點，不是逐句換圖。
- 表情在關鍵詞前 4–6 幀開始切換，關鍵詞落點完成；持續 1.5–4 秒後回到中性。
- 大手勢只放在段落開頭、重點句或結論；兩次大手勢至少間隔 2 秒。
- 同一畫面沒有可指向物件時，不使用 `point-left`／`point-right`。
- 嘴型由 `voiceover-edited.*` 音量驅動；靜音立刻回閉嘴，避免無聲時仍說話。
- 待機只保留極輕微呼吸、每 3–5 秒一次眨眼與偶爾小幅點頭；不要持續左右搖擺。
- 表情或手勢切換使用 6–10 幀淡入、2–4% 縮放或 8–16 px 位移；禁止瞬間跳圖與 CSS animation。
- 一次只表達一個主要情緒；手勢、表情與字幕高光必須服務同一個語意 beat。
