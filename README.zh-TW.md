# reels-video-craft

給 agent 與人協作用的直式短影音（Reels／Shorts／TikTok）製作系統——從選題、分集逐字稿，一路到渲染完成、通過 QA 的 MP4。

你丟進一份原始素材——口播影片、旁白音檔、逐字稿，或只有一個主題——它會問你要什麼，先篩掉做不到的製作方式，然後明確告訴你**這一支片**要跑哪些階段：要不要寫分鏡、視覺要不要對齊旁白時間、口播要不要先剪掉多餘段落，以及在哪些關卡必須由人確認才能往下走（尤其是任何付費或不可逆的動作之前）。

English: [README.md](README.md)　·　完整流程文件：[docs/WORKFLOWS.md](docs/WORKFLOWS.md)　·　內容上游：[docs/CONTENT-PIPELINE.md](docs/CONTENT-PIPELINE.md)

## 為什麼要這樣做

不同製作方式的差異比表面上大得多。純程式繪製的 Remotion 片不需要分鏡，也沒有旁白對齊問題；手繪故事流程兩者都要，而且還多一道「用真實字幕時間戳修正上游工具估錯的秒數」；生成式 B-roll 流程則需要 character sheet、continuity contract 與付費 API 預算。

這些差異寫成散文，agent 就得自己推論，而推論會漂移。所以它們被放進一份機器可讀的 registry（`flow/registry/*.json`），所有文件——包括完整流程參考——都由它生成。

## 安裝

```bash
git clone --recurse-submodules git@github.com:lovemage/reels-video-craft.git
cd reels-video-craft
cp .env.example .env    # 填入自己的 API key
npm link                # 或直接用 npx video-flow <command>
video-flow doctor       # 這台機器現在跑得動哪幾套方式
```

基本需求是 Node 22+ 與 FFmpeg。各方式自己宣告額外需求（`auto-editor`、`python3`、API key），`doctor` 會逐套告訴你缺什麼。

## 使用

內容上游（選題 → 撰稿 → 系列開案）：

```bash
video-flow script <topic> --init       # 建題目骨架：長篇母稿 + 分集逐字稿
video-flow script <topic>              # 檢查各集稿長度
video-flow series <topic> --method M4 --voice tts ...   # 整個題目批量開案
```

單支影片製作：

```bash
video-flow intake                      # 逐題確認 → production/<project>/brief.json
video-flow scaffold <project>          # 依 brief 產生該方式的專案骨架
video-flow plan <project>              # 這支片要跑哪些階段、下一步是什麼
video-flow tts <project> --sample      # TTS 先試聽，確認後 --full 合成完整旁白
video-flow lipsync <project> --sample --seconds 4        # 3–5 秒對嘴測試（人工關卡）
video-flow lipsync <project> --segment --from 34.5 --seconds 10 --label outro
video-flow done <project> <stage> --approved-by "使用者"
video-flow qa <project> out/final.mp4  # 規格檢查 + review still + contact sheet
video-flow doctor --project <project>  # 這個專案現在渲染得動嗎
video-flow validate                    # 驗證 registry 結構與交叉引用
```

`done` 有兩道閘：階段宣告的產物不在磁碟上不讓關，人工關卡沒有 `--approved-by` 不讓關。兩者都可以用 `--force` 覆寫，覆寫會記錄在 `brief.json`。

Lip sync **按視窗生成，不做全長**：頭像只在設定好的視窗出現（例如片頭、片尾各十秒），`--segment` 依視窗起迄切旁白音檔、只對那幾秒呼叫 API——而且必須先有一支 3–5 秒測試片經人工確認。

如果 agent 已經在對話中問完使用者，可以完全跳過互動：

```bash
video-flow intake --project my-video \
  --input talking-head-video --aspect 9:16 --method M4 \
  --voice tts --captions handwritten-highlight --bgm library
```

所有指令都支援 `--json`。

## 十五個階段 × 八套方式

階段矩陣、各方式細節與 Intake 問答的完整版都在 [docs/WORKFLOWS.md](docs/WORKFLOWS.md)（由 registry 生成，不要手改）。幾條被流程強制的鐵律：

- **語音驅動時間軸，永遠不是反過來。** 旁白先定稿（auto-editor 剪過，或試聽確認過的 TTS），下游所有時間——字幕時間碼、場景切點、`durationInFrames`、lip sync 視窗、交付的獨立旁白——一律從 `voiceover-edited.wav` 衍生。
- **估算的秒數只是草稿。** 上游工具用文字猜的場景長度，一律用校正後字幕做字元級 fuzzy match（單調游標）換算成真實影格。
- **人工關卡不可代簽。** `⏸` 階段沒有 `--approved-by` 關不掉，agent 無法悄悄跳過使用者沒看過的檢查點。

## 目錄結構

```
flow/registry/     stages.json · methods.json · questions.json   ← 單一事實來源
flow/cli/          video-flow 指令（含 tts / lipsync / script / series）
flow/test/         registry 與產物測試
docs/WORKFLOWS.md  生成文件——改 registry 後跑 `video-flow docs`
docs/CONTENT-PIPELINE.md   選題 → 母稿 → 分集稿 → 系列開案
content/<topic>/   分集逐字稿（純文字）
shared/            可重用元件：subtitle-mascot-kit、explainer-avatar-kit、
                   story-to-handdrawn-video（git submodule）
production/        實際專案工作區——已 gitignore，不會上傳
```

```bash
npm run check   # validate + test + docs:check
```

## 這個 repo 刻意不包含什麼

- **API key**——`.env` 已 ignore；複製 `.env.example` 填自己的。
- **個人影像與聲線**（`shared-assets/`）——真人頭像素材與 TTS 聲線 embedding 屬個人資料。
- **授權音樂**（`media/`）——授權範圍是作者自己發佈的影片，不含再散布。
- **專案工作區與成品**（`production/`、`out/`、所有 `*.mp4`／`*.wav`）——數 GB 的工作檔；各專案的素材來源與授權記錄在各自的 `CREDITS.md`。

## 新增一套製作方式

在 `flow/registry/methods.json` 加一筆：它吃哪些輸入、支援哪些比例、需要什麼工具，以及對十五個階段逐一表態。跑 `video-flow docs`。Intake、篩選、規劃、關卡與文件全部自動接上——沒有第二個要同步的地方。

## 授權

MIT。內含的第三方素材與上游技能維持各自授權（字型為 SIL OFL）；各製作專案的素材授權見其 `CREDITS.md`。
