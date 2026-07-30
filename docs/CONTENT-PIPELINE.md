# 內容上游流水線（選題 → 撰稿 → 系列 → 影片）

這份文件定義 `docs/WORKFLOWS.md`（下游影片 pipeline）**前面**的內容生產流程。
下游各階段的規則以 `flow/registry/*.json` 為單一事實來源，這裡不重抄；本文件只管
「影片開拍之前」的三件事：找題目、寫稿、批量開案。

```
scout（找熱門）→ script（母稿＋拆集）→ series（批量開案）→ video-flow pipeline（每集）
   ⏸ 人工選題        ⏸ 人工審稿          共用設定一次確認       既有關卡（詳見 WORKFLOWS.md）
```

## 目錄慣例

```
content/
├── scout/
│   └── 2026-07-29-trends.json        # 一次掃描一檔，檔名帶日期
└── <topic-slug>/                     # video-flow script <topic> --init 建立
    ├── TOPIC.md                      # 選題依據：為什麼現在做、參考連結、切角
    ├── master.zh-TW.md               # 長篇母稿（800–1500 字）
    └── episodes/
        ├── ep01.zh-TW.md             # 每集一檔＝該集逐字稿
        └── ep02.zh-TW.md
```

## 1 · Scout：熱門貼文偵察

由 agent 執行（用 agent-reach 等免費管道；**不**因此呼叫付費 Exa API）。觸發方式：

- 對話中說「掃一下這週的熱門題目」「scout <關鍵字>」；或
- 用 `/schedule` 排每週一次的自動掃描。

做法：依頻道定位的關鍵字，掃 2–3 個平台（YouTube／Twitter(X)／Reddit／Threads／小紅書
擇定）近 7 天高互動貼文，寫入 `content/scout/<YYYY-MM-DD>-trends.json`：

```jsonc
{
  "generatedAt": "2026-07-29T08:00:00Z",
  "keywords": ["AI 工具", "獨立接案"],
  "platforms": ["youtube", "x", "reddit"],
  "items": [
    {
      "platform": "youtube",
      "url": "https://…",
      "title": "…",
      "publishedAt": "2026-07-26",
      "engagement": { "views": 120000, "likes": 8100, "comments": 430 },
      "whyHot": "一句話：它為什麼被轉／被吵",
      "suggestedAngle": "我們的切角（不是照抄原貼文）",
      "hotScore": 4,        // 1–5：熱度 × 時效
      "fitScore": 5         // 1–5：與頻道定位的契合度
    }
  ]
}
```

排序以 `fitScore` 優先、`hotScore` 次之。互動數抓不到精確值時記量級（如 "~10k"），不得杜撰。

**⏸ 人工關卡：選題。** agent 把排序後清單摘要給使用者，使用者挑 1–2 題才往下走。
不得未經挑選就自行開題撰稿。

## 2 · Script：長篇母稿 → 拆集

```bash
video-flow script <topic> --init     # 建骨架
video-flow script <topic>            # 檢查各集長度（4.5 字/秒估算，60 秒上限，--rate/--max 可調）
```

寫作順序與規則：

1. 先把選中的 trends 記錄貼進 `TOPIC.md`，寫明切角與參考來源。
2. 寫 `master.zh-TW.md` 長篇母稿：完整論述、查證事實、標注來源。**先有母稿再拆集**，
   論述才不會拆散。
3. 拆集到 `episodes/epNN.zh-TW.md`，每集：
   - hook（第一段）6 秒內；單一論點；收尾／CTA。
   - 60 秒內（約 240–270 字）。
   - 能獨立看懂；集與集可互相導流（「上一集講過⋯」）。
   - 數字與縮寫寫成唸法（「BAP」→「B A P」），TTS 與字幕才不會唸錯。
4. 跑 `video-flow script <topic>` 直到全部合格。

**⏸ 人工關卡：審稿。** 使用者看過母稿與分集稿並表態 OK 才進 series。
改字比改影片便宜——這一關過了，後面到成片 QA 之間可以全自動。

## 3 · Series：批量開案

```bash
video-flow series <topic> \
  --method m1 --aspect 9:16 \
  --voice tts --tts-model x-ai/grok-voice-tts-1.0 --tts-voice rex \
  --captions plain --caption-languages zh-only \
  --avatar-mode none --bgm none
```

- 每一個 flag 都對應 intake 的一題；**全部**必須由使用者在對話中明確表態後才可帶入，
  缺一題整批擋下。series 不替任何題目補預設值。
- 「一次確認、整套系列生效」只限**同一個 topic 的各集**；跨系列回到逐題確認。
- 每集產生 `production/<topic>-epNN/`：brief.json（含 `series` 欄位記錄出處）＋
  `SCRIPT.zh-TW.md`（自動從分集稿複製）。
- 之後每集照 `video-flow plan <project>` 的指示走下游 pipeline。人工關卡仍逐集用
  `done --approved-by` 關閉，series 不代簽任何關卡。

## 4 · 每集下游（摘要，規則見 WORKFLOWS.md）

配音選 AI TTS 時的典型路徑：

```bash
video-flow plan <topic>-ep01                 # 看該集要跑哪些階段
video-flow tts <topic>-ep01 --sample         # ⏸ 試聽確認聲線（每個系列至少一次；換模型/聲線要重試聽）
video-flow tts <topic>-ep01 --full           # 合成完整旁白（raw + edited + generations.json）
video-flow done <topic>-ep01 tts-gen --approved-by "使用者"
# → 語音轉錄 → 字幕校對 → 時間軸鎖定 → 組裝 → 渲染 → qa → 交付（照 plan 指示）
```

同系列各集聲線相同：第一集試聽通過後，其餘各集可直接 `--full`，但任何一集聽起來
不對就回到 `--sample` 重新確認。

## 每系列的人工關卡總覽

| 關卡 | 頻率 |
| --- | --- |
| ① 選題（scout 清單挑題） | 每次掃描一次 |
| ② 審稿（母稿＋分集稿） | 每系列一次 |
| ③ TTS 試聽 | 每系列一次（換聲線重來） |
| ④ 成片 QA | 每集一次 |

字幕校對在 TTS 路徑可降為抽查：稿即逐字稿，whisper 對合成音的錯字率遠低於真人口播；
但時間碼校對與安全區檢查照舊。
