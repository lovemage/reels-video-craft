# aw-esim.com 廣告素材 — 專案總表

> **目標**：製作一支廣告素材，傳達 **aw-esim.com**（旅遊 eSIM／跨國上網）的作用——「一張 eSIM 走遍多國」。
> 品牌網址（登機牌與全片統一）：**aw-esim.com**
>
> **★ 目前主方向（四宮格放大縮回版）**：用現成 **2×2 四宮格圖 `03-visual-draft/image.png` 當第一幀與唯一畫布**，鏡頭「逐格放大填滿→角色做動作→縮回全景」，四格輪流：左上 TOKYO 走動／右上 SEOUL 拍照／左下 BANGKOK 吃東西／右下 VIETNAM 轉圈。單段以圖生片、鏡頭會動、**1:1 方形**。詳見 [02-video-prompt/ad-video-grid-zoom.md](02-video-prompt/ad-video-grid-zoom.md)。
>
> _先前方向（已被取代，保留備查）_：①純白/柔光背景、登機牌滑入＋換裝串四地；②Q 版碼頭巡遊四角。

## 資料夾結構
| 資料夾 | 內容 |
|---|---|
| [01-style/](01-style/) | **風格區塊**：寫實時尚廣告風 vs 京阿尼動畫風（STYLE 前綴） |
| [02-video-prompt/](02-video-prompt/) | **影片 Prompt 區塊**：主片 12s prompt、5s 京阿尼測試 prompt（`.md` 說明＋`.prompt.txt` 可直接餵腳本） |
| [03-visual-draft/](03-visual-draft/) | **視覺草稿區塊**：2×2 四格分鏡 prompt（A/B 兩版）＋草稿圖 |
| [04-workflow/](04-workflow/) | **工作流程**：生成腳本 `gen_video.py` / `gen_image.py`＋流程說明 |
| [assets/](assets/) | **素材與生成檔**（依類型分子資料夾，見下） |

## assets/ 分類
| 子資料夾 | 內容 |
|---|---|
| `assets/outputs/` | **生成檔案**：seedance 影片產出（v1/v2/v3 主片＋5s 測試） |
| `assets/avator/` | 參考人像 `S__24420360.jpg`＋人設風格圖 |
| `assets/drafts/` | 四格視覺草稿圖 |
| `assets/mascots/` | 各地動物梗圖（bunny/cat/elephant/fox/shisa/tiger，另一主題素材） |

## 目前產出
| 檔案 | 畫風 | 秒數 | 備註 |
|---|---|---|---|
| `assets/outputs/seedance-boardingpass-v3-12s-9x16.mp4` | 寫實 | 12s | **最新主片**（卡片遮擋換裝＋古法織造融合裝） |
| `assets/outputs/seedance-boardingpass-v2-12s-9x16.mp4` | 寫實 | 12s | 短髮/循環/深綠護照/英文登機牌/四色後背包 |
| `assets/outputs/seedance-boardingpass-12s-9x16.mp4` | 寫實 | 12s | 首版 |
| `assets/outputs/seedance-kyoani-test-5s-9x16.mp4` | 京阿尼 | 5s | 風格測試 |
| `03-visual-draft/image.png` | — | — | 四格草稿圖（自製） |

## 重要限制（務必知道）
1. **時長上限 12 秒**：`bytedance/seedance-2.0-fast` 單次生成 ≤ 12s。**要 15 秒須分兩段生成再剪接**。
2. **登機牌文字**：英文＋aw-esim.com 仍可能糊字/變形 → 要精準建議後製貼字。
3. **真人參考圖**：Seedance 隱私審核禁止真人照片當參考 → 人物改純文字描述生成（臉不會與 avatar 完全一致）。
4. **首尾循環**：不保證 100% 對齊，可能需後製裁頭尾幾幀。
5. **OpenRouter 額度**：初始 $5 已幾近用罄（最後一次圖片生成回 402）→ **再生成前需儲值**。

## 下一步
- 決定最終畫風（寫實 or 京阿尼）→ 見 `01-style/`。
- 生完整片：見 `04-workflow/README.md` 的指令。
- 15 秒版：分段（如 8s+7s）生成後剪接。
