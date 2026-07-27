# M2 · GBRO 拼貼 + Omni + Remotion

> 階段清單、關卡與注意事項見 [`../WORKFLOWS.md`](../WORKFLOWS.md)。這份只補長篇實作細節。

使用 `gbro-collage-broll` skill。**三階段審批不可跳關**——每一關都要等使用者確認才進下一關。

## 三階段審批

### 第 1 關 · 視覺隱喻（對應 `storyboard` 階段）

只提出每段約 5 秒的視覺隱喻，**等待確認**。這一關不生任何圖，成本為零，是最便宜的修正點。

### 第 2 關 · 靜幀（對應 `visual-design` 階段）

生成彩色半調紙拼貼靜幀，製作 contact sheet，**再次等待確認**。風格定案在這一關，之後改風格等於全部重生。

### 第 3 關 · 短動畫（對應 `asset-gen` 階段）

使用 Gemini Omni 生成短動畫，**逐段 QA** 後才放進 Remotion。

## 每段的產物

```text
frames/first-frame.png
frames/last-frame.png
omni-prompt.txt
omni/run-v01/final-5s.mp4
omni/run-v01/contact-sheet.jpg
```

保留 prompt 與 contact sheet，重生時才有可比對的基準。

## 對齊旁白

Omni 生成的短片長度固定在 3–5 秒，跟旁白段落不會剛好一樣長：

- 換頁開始時間對齊新段落語音，**不是平均分配**。
- 生成短片不足整段長度時，**在尾幀停留**，避免慢速拉伸造成畫面變形。

## 改比例

改交付比例必須**重新生成靜幀**，不可裁切既有素材——紙拼貼的構圖與留白是依畫布設計的，裁切會破壞版面。
