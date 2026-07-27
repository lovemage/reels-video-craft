# 視覺草稿 — 2×2 四格分鏡（Storyboard）

> 用途：影片開拍前的視覺草稿，一張圖同時呈現四個國家、同一人物、四張登機牌，用來鎖定四套造型／登機牌版型／構圖。
> 圖像模型建議：`google/gemini-3-pro-image`（多格排版＋英文字渲染最強）；GPT-Image / Nano Banana 亦可。
> 產出存放：`assets/drafts/`

## 共用內容（四格皆同，僅最上方 STYLE 不同）
```
A 2x2 four-panel storyboard grid (four equal cells, clean thin gutters). Each panel is a vertical 9:16 travel-fashion frame showing THE SAME young Asian woman traveler and a giant vertical boarding-pass card. Keep her the SAME person in all four panels: chin-length tidy grey-brown SHORT hair (airy, fluffy), delicate features, always wearing a backpack. In every panel she is walking, facing to the RIGHT.

Each panel contains a giant vertical BOARDING PASS card: white ticket face with a colored edge strip, a barcode, ticket fields labelled in ENGLISH (NAME / FLT / GATE / SEAT), the brand text "aw-esim.com" clearly printed in the top brand bar, and one big destination WATERMARK word in the center. ALL text on the cards must be ENGLISH only — absolutely no Chinese characters. Spell exactly: "aw-esim.com", "TOKYO", "SEOUL", "BANGKOK", "VIETNAM".

Each outfit fuses local ANCIENT WEAVING craft with MODERN design, and each panel uses a different backpack color:

- TOP-LEFT = TOKYO (Japan): navy modern kimono-style short jacket in Nishijin brocade with indigo aizome dye and sashiko stitching, white shirt, black pleated midi skirt, BLACK backpack, black loafers with white socks. Card edge strip LIGHT BLUE, watermark "TOKYO".
- TOP-RIGHT = SEOUL (Korea): modern streetwear built on a hanbok jeogori silhouette with traditional Korean brocade (mother-of-pearl sheen), white baseball cap, polka-dot skirt layered over jeans, RED backpack, red shoes. Card edge strip BLUE, watermark "SEOUL".
- BOTTOM-LEFT = BANGKOK (Thailand): modern dress in Thai silk mudmee ikat pattern with gold brocade, straw hat, BEIGE woven-straw backpack, sandals, holding an ice pop. Card edge strip PINK, watermark "BANGKOK".
- BOTTOM-RIGHT = VIETNAM: modern wide-leg linen co-ord fusing an ao dai mandarin collar and side slit with Vietnamese tho cam brocade weave, a Vietnamese conical hat held in hand, RATTAN backpack, flat sandals. Card edge strip BAMBOO GREEN, watermark "VIETNAM".

Composition: full-body, elegant, consistent character across all four cells. This is a visual draft / storyboard for a fashion travel ad.
```

## 版本 A：京阿尼動畫風（在共用內容最上方加這段 STYLE）
```
STYLE: Kyoto Animation (KyoAni) style 2D cel-shaded anime illustration — clean cel shading, soft pastel lighting, gentle bloom glow, large expressive eyes, delicate face drawing, detailed hair highlights, soft gradient sky background (pale blue to warm white) with bokeh light specks. Bright, fresh, Japanese anime MV quality.
```

## 版本 B：寫實時尚廣告風（在共用內容最上方加這段 STYLE）
```
STYLE: realistic fashion editorial photography — pure white seamless infinite backdrop, clean bright studio lighting, high-end fashion campaign look, photorealistic fabric texture.
```

## 提示
- 兩版差別只在最上方 STYLE，其餘四格內容一致，方便並排對比。
- 有比例設定時，四格用直式（每格 9:16）。
- 登機牌英文（TOKYO/SEOUL/BANGKOK/VIETNAM＋aw-esim.com）務必檢查拼字。
