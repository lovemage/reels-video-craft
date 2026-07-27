# M6 · Seedance 2.0 Fast（OpenRouter）+ Remotion

> 階段清單、關卡與注意事項見 [`../WORKFLOWS.md`](../WORKFLOWS.md)。這份只補長篇實作細節。

## 連續性流程

```text
Character Sheet
  → 每段 Storyboard
  → 每段 Prompt + Continuity Contract
  → OpenRouter Seedance 2.0
  → QA Contact Sheet
  → 上一段尾幀接下一段首幀
  → 合併影片
```

**Character Sheet 先行。** 沒有先鎖定人物、服裝與場景，跨鏡頭一定不連貫，之後只能整批重生。

## API 呼叫

- 端點：`POST /api/v1/videos`（非同步）
- 模型：`bytedance/seedance-2.0-fast`
- Key：從 `.env` 讀 `OPENROUTER_API_KEY`

流程：提交 job → **輪詢完成狀態** → 下載 MP4 到專案素材目錄。

> **不得透過 chat completions 偽造影片呼叫。** 那不是這個能力的入口，拿到的東西也不是影片。

## 規格與成本

- 預設優先 9:16、720p、4–8 秒短鏡頭。
- OpenRouter 公開起價約 US$0.0538／秒——**僅供估算**。實際價格、支援長度與解析度須以當下 models API 回傳為準，不要照抄這裡的數字給使用者。

## 生成順序

1. **先輸出單鏡頭測試**，取得使用者確認。
2. 確認後才批量生成。
3. 每段成功生成產出可人工檢查的 **contact sheet**，並留下可比對的 **render record**。
4. `--resume` 只沿用輸入未變的版本。

## 首尾幀接續

要做連貫長鏡時，把上一段的尾幀當下一段的首幀輸入。每個 Cut 的 prompt 要附 **continuity contract**：明確寫出哪些元素必須維持不變（人物外觀、光線方向、場景陳設、鏡頭運動方向）。
