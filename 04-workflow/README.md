# 工作流程（Workflow）

aw-esim.com 廣告素材的生成流程與腳本。

## 前置
- `.env` 需有有效的 `OPENROUTER_API_KEY`（`sk-or-v1-...`，帳號需有 credit）。
- 驗證金鑰：`curl -s -o /dev/null -w "%{http_code}\n" https://openrouter.ai/api/v1/key -H "Authorization: Bearer $KEY"` → 應回 `200`。

## 腳本
| 檔案 | 用途 | 模型 |
|---|---|---|
| [gen_video.py](gen_video.py) | 送出影片生成 + 輪詢結果 | `bytedance/seedance-2.0-fast`（`/videos`） |
| [gen_image.py](gen_image.py) | 生成圖片（四格草稿等） | `google/gemini-3-pro-image`（`/chat/completions`） |

## 影片生成（gen_video.py）
以環境變數指定 prompt 檔與秒數（秒數 ≤ 12）：
```bash
PROMPT_FILE=/path/to/prompt.txt DURATION=12 python3 04-workflow/gen_video.py
```
- 內建參數：9:16、720p、camera_fixed、generate_audio。
- 完成後回傳 `unsigned_urls`，需帶金鑰下載：
```bash
curl -s -L -H "Authorization: Bearer $KEY" \
  "https://openrouter.ai/api/v1/videos/<ID>/content?index=0" -o assets/outputs/xxx.mp4
```

## 圖片生成（gen_image.py）
```bash
PROMPT_FILE=/path/to/img_prompt.txt OUT=assets/drafts/xxx.png python3 04-workflow/gen_image.py
```

## 已知限制與對策
| 限制 | 對策 |
|---|---|
| 單段 duration ≤ 12 秒（要 15 秒須分段剪接） | 8s+7s 兩段生成後剪接 |
| 登機牌小字會糊/變形 | 後製貼字 |
| 真人照片參考圖被隱私審核擋下 | 改純文字描述人物，或用「非寫實/風格化」人設圖 |
| 首尾循環不保證完全對齊 | 後製裁頭尾幾幀對齊 |

## 費用參考
- 12 秒影片：約 $1.45／次
- 5 秒影片：約 $0.60／次
