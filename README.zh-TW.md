# video-flow

給 agent 與人協作用的 AI 影片製作流程系統。

你丟進一份原始素材——口播影片、旁白音檔、逐字稿，或只有一個主題——它會問你要什麼，先篩掉做不到的製作方式，然後明確告訴你**這一支片**要跑哪些階段：要不要寫分鏡、視覺要不要對齊旁白時間、口播要不要先剪掉多餘段落，以及在哪些關卡必須由人確認才能往下走。

English: [README.md](README.md)　·　完整流程文件：[docs/WORKFLOWS.md](docs/WORKFLOWS.md)

## 為什麼要這樣做

不同製作方式的差異比表面上大得多。純程式繪製的 Remotion 片不需要分鏡，也沒有旁白對齊問題；手繪故事流程兩者都要，而且還多一道「用真實字幕時間戳修正上游工具估錯的秒數」；生成式 B-roll 流程則需要 character sheet、continuity contract 與付費 API 預算。

這些差異寫成散文，agent 就得自己推論，而推論會漂移。所以它們被放進一份機器可讀的 registry，所有文件都由它生成。

## 安裝

```bash
git clone <this repo> && cd video-flow
npm link            # 或直接用 npx video-flow <command>
video-flow doctor   # 這台機器現在跑得動哪幾套方式
```

基本需求是 Node 22+ 與 FFmpeg。各方式自己宣告額外需求（`auto-editor`、`python3`、API key），`doctor` 會逐套告訴你缺什麼。

## 使用

```bash
video-flow intake                      # 逐題確認 → production/<project>/brief.json
video-flow scaffold <project>          # 依 brief 產生該方式的專案骨架
video-flow plan <project>              # 這支片要跑哪些階段、下一步是什麼
video-flow done <project> <stage> --approved-by "使用者"
video-flow qa <project> out/final.mp4  # 規格檢查 + review still + contact sheet
video-flow doctor --project <project>  # 這個專案現在渲染得動嗎
video-flow validate                    # 驗證 registry 結構與交叉引用
```

`done` 有兩道閘：階段宣告的產物不在磁碟上不讓關，人工關卡沒有 `--approved-by` 不讓關。
兩者都可以用 `--force` 覆寫，覆寫會記錄在 `brief.json`。

如果 agent 已經在對話中問完使用者，可以完全跳過互動：

```bash
video-flow intake --project my-video \
  --input talking-head-video --aspect 9:16 --method M4 \
  --voice human --captions designed --bgm library
```

所有指令都支援 `--json`。

## 方式怎麼被篩出來

前兩題——你提供什麼素材、這支片主要在哪裡被看到——會在你選擇之前先縮小範圍。被排除的方式不會靜默消失，而是連同原因一起列出。

```
$ video-flow methods --input talking-head-video --aspect 16:9

可用製作方式（5/8）
M1  純 Remotion                9:16 16:9 1:1 4:5   無 API 成本
M2  GBRO 拼貼 + Omni           9:16 1:1 4:5 16:9   按素材計費   GEMINI_API_KEY
M6  Seedance 2.0 Fast          9:16 16:9 1:1       按秒計費     OPENROUTER_API_KEY
M7  HyperFrames + Remotion     9:16 16:9 1:1 4:5   無 API 成本
M8  日式節目製作方式           9:16 16:9 1:1 4:5   無 API 成本

已排除（3）
✗ M3  不吃「口播影片」這種輸入；不支援 16:9（只沿用來源比例）
✗ M4  不支援 16:9（支援 9:16、3:4）
✗ M5  不支援 16:9（支援 9:16、3:4）
```

「適合手機看」與「適合電腦看」因此變成一個真正的篩選條件，而不是文件裡的一句提醒。

觀看情境會對應到實際畫布：直式 1080×1920、橫式 1920×1080、方形、直式動態消息，或 **`custom`**——選 custom 會追問寬高，並在奇數尺寸時警告（H.264 不接受）。只有程式繪製的方式提供 custom：生成式素材無法在不重新生圖的情況下配合任意畫布。

## 階段矩陣

14 個階段、8 套方式。`●` 必要　`◆` 由上游技能鎖定、不可自訂　`○` 選用　`·` 不需要。

| 階段 | 關卡 | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| 需求確認 | ⏸ | ● | ● | ● | ● | ● | ● | ● | ● |
| 素材歸位 | | ● | ● | ● | ● | ● | ● | ● | ● |
| 口播剪輯（auto-editor） | ⏸ | ● | ● | · | ● | ● | ● | ● | ● |
| 語音轉錄 | | ● | ● | · | ● | ● | ● | ● | ● |
| 字幕校對 | ⏸ | ● | ● | · | ● | ● | ● | ● | ● |
| 時間軸鎖定 | | ● | ● | · | ● | ● | ● | ● | ● |
| 分鏡規劃 | ⏸ | ○ | ● | · | ● | ● | ● | ○ | ● |
| 視覺風格定案 | ⏸ | ○ | ● | ● | ◆ | ◆ | ● | ● | ● |
| 素材生成 | ⏸ | · | ● | ● | ● | ● | ● | · | ○ |
| 旁白時間對齊 | | · | ● | · | ● | ● | ● | ● | ● |
| 組裝 | | ● | ● | ○ | ● | ● | ● | ● | ● |
| 渲染 | | ● | ● | ● | ● | ● | ● | ● | ● |
| 品質檢查 | ⏸ | ● | ● | ● | ● | ● | ● | ● | ● |
| 交付 | | ● | ● | ● | ● | ● | ● | ● | ● |

⏸ 是人工確認關卡。`video-flow done` 沒有 `--approved-by` 就不讓關，agent 無法靜默跳過使用者從沒看過的檢查點。

### 直接回答常見問題

- **需要寫分鏡**：M2、M4、M5、M6、M8　·　選用：M1、M7　·　不需要：M3
- **需要先對齊口播時間**：M2、M4、M5、M6、M7、M8　·　不需要：M1、M3
- **需要先剪掉口播多餘段落**：M1、M2、M4、M5、M6、M7、M8　·　不需要：M3
- **需要呼叫付費生成 API**：M2、M3、M4、M5、M6　·　不需要：M1、M7
- **視覺風格由上游技能鎖定、不可自訂**：M4、M5

| 代號 | 製作方式 |
| --- | --- |
| M1 | 純 Remotion — 畫面全部由程式繪製 |
| M2 | GBRO 拼貼 + Gemini Omni + Remotion |
| M3 | Gemini Omni 直接影片編輯 |
| M4 | 手繪日記漫畫 + 真人懸浮頭像 |
| M5 | 手繪故事線稿上色（HyperFrames） |
| M6 | Seedance 2.0 Fast B-roll（OpenRouter）+ Remotion |
| M7 | HyperFrames + Remotion |
| M8 | 日式節目製作方式（Remotion Program Graphics） |

## 流程強制的兩條規則

**語音決定時間軸，不是反過來。** 原始旁白一律先經 `auto-editor` 剪掉靜音與冗長停頓，之後才開始量測。所有下游時間——字幕時間碼、場景切點、`durationInFrames`、交付的獨立旁白——都由處理後的檔案推導。畫面不會為了配合事先排好的版面而被拉伸。

**估算出來的秒數只是草稿。** 上游工具依文字猜出來的分鏡秒數，必須用每段旁白去 fuzzy match 校正後的字幕時間戳來取代，並使用單調游標避免同樣的詞在文本別處被誤配。

**共用階段可以被單一方式改寫。** 當共用定義不合用時，方式可以宣告 stage override。M8 沒有上游工具估的秒數要修，所以它的「旁白時間對齊」被改寫成**關鍵詞揭示對時**：在字幕裡定位每個 beat 的觸發關鍵詞，取那個字的時間當揭示影格。不同名稱、不同產出檔（`programBeats.ts` 而非 `segments.ts`）、不同規則，但佔同一個階段位置。`video-flow plan` 會顯示實際適用的那一版。

## 目錄

```
flow/registry/     stages.json · methods.json · questions.json   ← 單一事實來源
flow/cli/          video-flow 指令
docs/WORKFLOWS.md  自動生成——改完 registry 跑 `video-flow docs`
examples/          去識別化的範例專案
production/        你自己的專案（已 gitignore）
```

```bash
npm run check   # validate + test + docs:check
```

`docs:check` 會在生成文件與 registry 不同步時失敗；`validate` 則在 registry 出錯時擋下——
少對某個階段表態、`default` 比例不在 `supported` 內、guide 路徑斷掉，都會在變成
難懂的 CLI 行為之前先被抓出來。

## 新增一套製作方式

在 `flow/registry/methods.json` 加一筆，寫明它吃哪些輸入、支援哪些比例、需要什麼工具與 key，以及 14 個階段各自的狀態。跑 `video-flow docs`。intake 問答、方式過濾、階段計畫、關卡強制與文件全部會自動吃到——沒有第二個地方要改。

## 授權

MIT。內含的第三方素材與上游技能保留各自的授權；見各專案的 `CREDITS.md`。
