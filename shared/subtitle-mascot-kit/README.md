# Subtitle + Mascot Kit

可重複使用的 Remotion 字幕與寵物吉祥物元件，來源專案：`production/use-your-tools-workflow/`。因為每支影片都是獨立的 Remotion 專案（各自的 `package.json`），這裡是「複製後再套用」的共用範本，不是跨專案即時 import。

## 內容

| 路徑 | 說明 |
| --- | --- |
| `src/CaptionsOverlay.tsx` | 無底卡雙語字幕：白字＋極細描邊，句尾標點自動清除，關鍵詞高光（金黃／灰綠／赭紅三色輪替）。內容（`highlightMap`／`englishLines`）用 props 傳入，元件本身不含任何專案內容。 |
| `src/MascotCompanion.tsx` | 固定寵物角色（目前是像素貓），跨整支片存在。平常打盹／發呆，高光關鍵詞快到時走去下一個定點，高光當下跳一下或歪頭反應。純肢體動作，沒有表情變化。 |
| `public/mascot/*.png` | 5 張去背完成的像素貓姿勢：`cat-idle`、`cat-jump`、`cat-tilt`、`cat-sleep`、`cat-walk`。 |

## 套用到新專案的步驟

1. 複製 `src/CaptionsOverlay.tsx`、`src/MascotCompanion.tsx` 到新專案的 `src/`。
2. 複製 `public/mascot/*.png` 到新專案的 `public/mascot/`（Remotion 的 `staticFile()` 只認自己專案的 `public/`，圖片一定要實際複製過去，不能跨專案引用）。
3. 在新專案自建一個 `src/captionContent.ts`，依照這支片的 `captions.json` 索引寫 `HIGHLIGHT_MAP`（只標重點詞，不要標點符號，不用每句都標）與 `ENGLISH_LINES`（雙語翻譯，可省略不需要雙語的專案）。
4. 在 `Composition.tsx` 裡：
   - 用 `computeHighlightFrames(captions, fps, HIGHLIGHT_MAP)` 算出全域高光影格清單。
   - 掛 `<MascotCompanion highlightFrames={highlightFrames} />`（放在字幕元件之前，才不會被字幕蓋住）。
   - 掛 `<CaptionsOverlay captions={captions} highlightMap={HIGHLIGHT_MAP} englishLines={ENGLISH_LINES} />`。

## 設計限制／已知取捨

- 貓咪走位用固定的 4 個 X 座標之字形循環（`WAYPOINTS`），不是真的量測字幕文字位置去追字——量測 DOM 版位在 Remotion 逐幀渲染下不夠穩定，用固定站位換位置反而更可控。
- 貓咪站位在畫面偏下方（`bottom: 560`），是為了同時避開右上角懸浮頭像跟底部雙語字幕安全區；換到不同版位配置的專案要自行調整這個數字。
- 表情刻意維持中性（簡單黑點眼＋一條嘴線），情緒完全靠動作（跳、歪頭、走路、打盹）傳達，重繪新姿勢時要延續這個原則。
- 圖片用 gpt-image 生成時「transparent background」的要求不可靠，實際拿到的是畫了棋盤格紋理的不透明 RGB 圖，不是真的 alpha。目前用邊界向內漫水填充（flood fill）去背，只清掉跟外框相連的棋盤格區域，避免誤刪貓咪身上本來就偏淺色的區塊（例如肚子的奶油色）。新姿勢一樣要跑這道手續才能用。
