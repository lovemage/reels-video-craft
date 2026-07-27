# Agent 操作規則

流程定義的**單一事實來源是 `flow/registry/*.json`**，不是這份文件。這裡只寫「怎麼跟使用者協作」與「不准做什麼」；「這支片要跑哪些階段」一律問 CLI，不要自己推論或憑記憶回答。

```bash
node flow/cli/index.mjs methods --input <type> --aspect <ratio> --json   # 有哪些方式可選
node flow/cli/index.mjs intake ...                                       # 產出 brief.json
node flow/cli/index.mjs plan <project> --json                            # 該跑哪些階段、下一步
node flow/cli/index.mjs done <project> <stage> --approved-by "<誰>"       # 關掉一個階段
node flow/cli/index.mjs scaffold <project>                                # 產生該方式的專案骨架
node flow/cli/index.mjs qa <project> <output.mp4>                         # 交付前檢查
node flow/cli/index.mjs doctor --project <project>                        # 這個專案渲染得動嗎
```

## 開始一支新影片

觸發時機：使用者要求建立新影片、進入新的 `production/<project>/`、重製版本，**或提供任何原始素材（影片、音檔、逐字稿、圖片）準備用於新影片**。

1. **先跑 `methods --input ... --aspect ... --json`**，把實際可選的方式連同被排除的原因列給使用者看。不要憑印象背方式清單。
2. **逐題等待明確答案。** 問題定義在 `flow/registry/questions.json`。
   - 前一支影片的設定不是這一支的預設，即使方式相同也要複述並取得確認。
   - 使用者一次只答部分題目時，只追問還沒確認的項目，不替其他項目假設。
   - 「你決定」「都可以」「隨便」視為**尚未確認**：可以提出一個具體建議，但仍須使用者對該建議表態。
3. **核心四項（方式／配音／字幕／BGM）全部確認前**，只能整理需求、逐字稿與選項比較；不得生成素材、呼叫付費 API 或開始渲染。
4. 確認完成後用 `intake` 的 flag 模式一次寫入 brief.json，不要手刻這個檔。

## 執行階段

- 每次要動手前先跑 `plan <project> --json`，照它給的下一步做。不要跳階段。
- `gate: human` 的階段必須實際取得使用者確認，再用 `done --approved-by` 關閉。**不得自己代簽。**
- `done` 會檢查該階段宣告的產物是否真的存在。被擋下時先把檔案做出來，**不要直接加 `--force`**——`--force` 是給「這支片刻意不做這個產物」用的，會留下記錄。
- 同一個階段在不同方式下可能有不同名稱、產物與規則（stage override）。一律以 `plan --json` 回傳的為準，不要套用你記得的通用版本。
- 每個階段的規則寫在 `flow/registry/stages.json` 的 `rules`，方式專屬的注意事項與覆寫寫在 `methods.json` 的 `stageOverrides`。照著做，不要自行加碼或省略。
- 階段被標 `skip` 就是這套方式不需要它，不要「順便做一下」。

## 硬性禁止

- **不得跳過 auto-editor first pass**（`speech-edit` 階段）。原始旁白未經處理就量秒、做字幕或排分鏡，整個時間軸都是錯的。原始檔一律保留為 `voiceover-raw.*`，處理版另存 `voiceover-edited.*`，不可覆寫。
- **不得未經本次確認就套用通用字幕元件、通用字幕樣式或通用 mascot kit。** 使用者選「一般清楚字幕」才可用簡潔標準字幕；選「設計高光字幕」必須沿用或建立該專案已確認的設計，沒有既有設計時先提視覺稿取得確認。不得以共用 kit、預設 TikTok 字幕或一般底卡字幕冒充高光字幕。
- **`visual-design` 標為 `locked` 的方式（M4、M5）不得自行編寫美術風格提示詞**，也不得沿用其他專案的視覺系統。風格由上游技能自己的 `DESIGN.md` 決定。
- **不得覆蓋既有輸出。** 新版本用清楚的檔名另存。
- **不得把 API key 寫入程式、文件、日誌或回覆。** 只從 `.env` 讀取，只記錄變數名稱。
- **付費 API 一律先出單一鏡頭／contact sheet 取得確認再批量生成。**

## 交付

- Remotion 專案先 `npm run lint` 再 `npx remotion render`。
- 用 `video-flow qa` 跑自動檢查（尺寸、fps、codec、音訊峰值、旁白覆蓋）。它列出的人工項目（字幕同步、安全區、資訊正確性）仍要實際看過。
- 最終回覆提供完整影片、獨立旁白與重要腳本的絕對路徑。
- 音樂、圖片或外部素材留下來源與授權註記。

## 檔案慣例

新專案一律遵守，不要沿用舊專案的不一致命名：

```
production/<project>/
├── brief.json                    # intake 產出，流程狀態也記在這
├── SCRIPT.zh-TW.md
├── STORYBOARD.zh-TW.md           # 需要分鏡的方式才有
├── public/
│   ├── voiceover-raw.*           # 永久保留，不覆寫
│   ├── voiceover-edited.*        # 時間軸唯一基準
│   └── captions/captions.json    # @remotion/captions 格式
├── src/
└── out/
```

若專案的旁白檔不在慣例路徑，把實際路徑寫進 `brief.json` 的 `narrationFile`，QA 才能正確比對。

## 改流程本身

改 `flow/registry/*.json`，再跑 `node flow/cli/index.mjs docs` 重新生成 `docs/WORKFLOWS.md`。**不要手改生成的文件**，也不要把流程規則另外抄一份到別的 markdown——那正是之前三份文件不同步的原因。
