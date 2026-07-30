# HyperFrames 二次元主講人 rig

給 flow intake `avatarMode = anime-presenter`（路線 B）使用的一套可重用做法。已在 `production/chatgpt-atlas-shutdown-2026` 完整跑過並算圖驗證。

機器可讀的參數在 `rig.json`，嘴部錨點在 `anchors.json`。本檔說明**為什麼**要這樣做 —— 這幾條規則都是踩到問題才改出來的，照抄可以省掉一輪。

## 這套 rig 解決的四個問題

### 1. 兩套素材不是可互換的圖層

`gestures/` 是 1024×1536 直式半身，`expressions/` 是 1536×1024 **橫式**胸像。裁切與頭部尺寸差約 1.5 倍，橫式胸像塞不進直式版位。

把它們當成**兩種景別**：`stand`（中景，只取 gestures）與 `close`（特寫，只取 expressions）。跨景別**一律硬切、只發生在幕與幕的交界**，禁止交叉淡入 —— 跨 rig 淡入會拍出角色的頭在鏡頭裡膨脹又縮回去，看起來是 morph 失敗。

特寫倍率要夠。用尺度地標換算，頭部倍率低於約 1.5 會被讀成跳接而不是刻意的推進。Atlas 那支用 **1.93×**。

### 2. 不能用外框寬度縮放

`06-thumbs-up.png` 是 1086×1448，其餘 gesture 是 1024×1536。套同一個框寬，它的頭會比別張小一圈。

用 `scale_landmark_to_lip` 對齊：四張 gesture 實測是 35 / 35 / 35 / 36，也就是**原圖裡的頭是同一個尺寸**，只有畫布尺寸不同。expressions 是 52，比值 1.475。

```
scale_close = scale_stand × 目標頭部倍率 ÷ 1.475
```

### 3. `mouths/` 的六張素材不能用

那是**寫實光澤唇**，角色是漫畫線稿臉。在中景勉強，在特寫明顯是外貼物。更關鍵的是角色原圖**已經畫了一張閉合的嘴**，overlay 蓋不掉，會變成兩張嘴。

改用線稿式嘴型：以角色原本的上唇線為錨點，往下開一個深色橢圓口腔（`medium` 另加一條齒縫）。**閉嘴時什麼都不畫**，直接露出原生的嘴 —— 這同時避開了補膚色補丁的問題（臉上有明暗漸層，平塗補丁會露出接縫）。

只用三態。特寫也只用三態，齒列細節在這個畫風下只會加深外貼感。

### 4. 角色不要用色板墊底

色板在實際畫面上讀成一塊左右緣都懸空的浮動方框，像是版面做錯。改用一條 3px 結構線放在角色底線；再配一條字幕線，中間就自然形成淨空隔離帶。

## 校正一個新姿勢

`anchors.json` 只有五張是 `verified`（Atlas 那支實際用到的）。其餘標 `uncalibrated` —— **不要用鄰近姿勢的數字內插**，各姿勢的頭部朝向不同，唇線中心差得很遠。

全自動地標偵測試過，不可用：在 16 張上有 7 張直接失敗，能跑的裡面有 3 張數字錯得離譜（最大差 182px）。眼鏡框、頭髮與衣領在門檻法下分不開。所以是半自動的：

```bash
# 1. 產生標尺圖，用眼睛讀出唇線大概在哪
python3 tools/calibrate.py grid gestures/01-point-left.png

# 2. 用粗略種子精修出實際數值
python3 tools/calibrate.py measure gestures/01-point-left.png --seed 520,390

# 3. 一定要看這張：三種嘴型在最終尺寸下的合成圖
python3 tools/calibrate.py proof gestures/01-point-left.png --seed 520,390 \
        --canvas-width 430
```

第 3 步不可略過。數值通過驗證不代表它落在正確的特徵上，而且**在 1:1 判斷，不要在放大圖判斷** —— 有一版嘴型在 4× 下很醜，在實際尺寸下完全正常；也有一版反過來，小開嘴在放大圖看得見，在 1:1 只有 2.8px 高、跟閉嘴分不出來。

精修步驟受 `tools/test_calibrate.py` 保護，基準值就是這五張目視核可過的數字。改動 `calibrate.py` 後要跑它。

## 嘴型軌

```bash
python3 tools/mouth_track.py voiceover.wav --fps 30 --frames 773 > mouth.json
```

門檻是該段錄音自身峰值的比例，不是絕對 dBFS —— 換一段音量不同的旁白不必重調。會吸收單幀尖峰，否則子音會讓嘴在 30fps 下閃爍。

輸出只記**狀態變化**：26 秒的旁白收斂成約 143 筆，直接展開成時間軸上的 set 即可。

## 上時間軸

參考實作：`production/chatgpt-atlas-shutdown-2026/hyperframes/index.html`。

- Avatar 是**主場的共用層**，不要放進各幕的 sub-composition —— 底線與嘴型錨點才會在整支片子裡是同一套座標。
- 各 shot 是主場 root 的直接子元素（HyperFrames 只承認直接子元素為 clip）。
- 相鄰 shot 交錯配軌，才能在轉場時重疊。
- `stand` 各姿勢**以臉部中心對齊同一個 x**，不要靠右對齊：各手勢的手臂伸展量不同，靠右對齊會讓頭在切點橫移約 59px，對齊臉只跳 12px。
- 放大動畫的 `transform-origin` 必須是 `bottom center`。
- `close` 的出血以角色的 **alpha bbox** 邊緣計算，不是圖檔邊緣 —— expressions 左右都有透明邊。
