# Subtitle + Mascot Kit

可重複使用的 Remotion 字幕與寵物吉祥物元件，來源專案：`production/use-your-tools-workflow/`。因為每支影片都是獨立的 Remotion 專案（各自的 `package.json`），這裡是「複製後再套用」的共用範本，不是跨專案即時 import。

## 內容

| 路徑 | 說明 |
| --- | --- |
| `src/CaptionsOverlay.tsx` | 無底卡雙語字幕：中文高光主層＋下方英文副層，句尾標點自動清除。內容以 `captions`／`englishCaptions`／`highlightMap` 傳入；舊版 `englishLines` 仍相容。 |
| `src/MascotCompanion.tsx` | 固定寵物角色（目前是像素貓），跨整支片存在。平常打盹／發呆，高光關鍵詞快到時走去下一個定點，高光當下跳一下或歪頭反應。純肢體動作，沒有表情變化。 |
| `public/mascot/*.png` | 5 張去背完成的像素貓姿勢：`cat-idle`、`cat-jump`、`cat-tilt`、`cat-sleep`、`cat-walk`。 |

## 套用到新專案的步驟

1. 複製 `src/CaptionsOverlay.tsx`、`src/MascotCompanion.tsx` 到新專案的 `src/`。
2. 複製 `public/mascot/*.png` 到新專案的 `public/mascot/`（Remotion 的 `staticFile()` 只認自己專案的 `public/`，圖片一定要實際複製過去，不能跨專案引用）。
3. 中文字幕存成 `public/captions/captions.json`；選擇中英雙語時，英文另存 `public/captions/captions.en.json`。兩份都使用 `@remotion/captions` 格式，而且每段 `startMs`／`endMs` 必須完全相同。
4. 在新專案自建 `src/captionContent.ts`，依照中文字幕索引寫 `HIGHLIGHT_MAP`：只標真正的重點詞，不標標點、不逐字全標。
5. 在 `Composition.tsx` 裡：
   - 用 `computeHighlightFrames(captions, fps, HIGHLIGHT_MAP)` 算出全域高光影格清單。
   - 掛 `<MascotCompanion highlightFrames={highlightFrames} />`（放在字幕元件之前，才不會被字幕蓋住）。
   - 掛 `<CaptionsOverlay captions={captions} englishCaptions={englishCaptions} highlightMap={HIGHLIGHT_MAP} />`。

## 雙語層級

- 中文是主字幕：60px／800 weight，承擔關鍵詞 marker、高光色與輕量 scale 動態。
- 英文固定在中文正下方：31px／600 weight，延遲約 2 幀淡入，不做逐字高光。
- 中英文視為同一字幕群組共同進出；英文不得另外切段或漂移時間碼。
- 英文建議控制在兩行內；逐字直譯太長時，改寫為不失原意的精簡英文。
- `validateBilingualCaptionAlignment(captions, englishCaptions)` 必須回傳空陣列，才可進入渲染。

## 設計限制／已知取捨

- 貓咪走位用固定的 4 個 X 座標之字形循環（`WAYPOINTS`），不是真的量測字幕文字位置去追字——量測 DOM 版位在 Remotion 逐幀渲染下不夠穩定，用固定站位換位置反而更可控。
- 貓咪站位在畫面偏下方（`bottom: 560`），是為了同時避開右上角懸浮頭像跟底部雙語字幕安全區；換到不同版位配置的專案要自行調整這個數字。
- 表情刻意維持中性（簡單黑點眼＋一條嘴線），情緒完全靠動作（跳、歪頭、走路、打盹）傳達，重繪新姿勢時要延續這個原則。
- 圖片用 gpt-image 生成時「transparent background」的要求不可靠，實際拿到的是畫了棋盤格紋理的不透明 RGB 圖，不是真的 alpha。目前用邊界向內漫水填充（flood fill）去背，只清掉跟外框相連的棋盤格區域，避免誤刪貓咪身上本來就偏淺色的區塊（例如肚子的奶油色）。新姿勢一樣要跑這道手續才能用。
