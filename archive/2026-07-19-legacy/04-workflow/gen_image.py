#!/usr/bin/env python3
import base64, json, os, sys, urllib.request, urllib.error

ROOT = "/home/ivan-bai/projects/seedance"
MODEL = os.environ.get("IMG_MODEL", "google/gemini-3-pro-image")
PROMPT_FILE = os.environ["PROMPT_FILE"]
OUT = os.environ["OUT"]

key = None
with open(os.path.join(ROOT, ".env")) as f:
    for line in f:
        line = line.strip()
        if line.startswith("OPENROUTER_API_KEY="):
            key = line.split("=", 1)[1].strip().strip('"').strip("'")
if not key:
    sys.exit("no key")

with open(PROMPT_FILE, encoding="utf-8") as f:
    prompt = f.read()

# 可選：輸入圖（image-to-image 編輯，如移除人物）
INPUT_IMAGE = os.environ.get("INPUT_IMAGE")
if INPUT_IMAGE:
    ext = os.path.splitext(INPUT_IMAGE)[1].lstrip(".").lower() or "png"
    mime = "jpeg" if ext in ("jpg", "jpeg") else ext
    with open(INPUT_IMAGE, "rb") as f:
        ib64 = base64.b64encode(f.read()).decode()
    content = [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": f"data:image/{mime};base64,{ib64}"}},
    ]
else:
    content = prompt

body = {
    "model": MODEL,
    "messages": [{"role": "user", "content": content}],
    "modalities": ["image", "text"],
}
IMG_SIZE = os.environ.get("IMG_SIZE")   # 例 "1536x1024"（横向）
if IMG_SIZE:
    # 尽量兼容不同后端的尺寸/比例字段
    body["size"] = IMG_SIZE
    try:
        w, h = IMG_SIZE.lower().split("x")
        body["image_size"] = {"width": int(w), "height": int(h)}
    except Exception:
        pass

req = urllib.request.Request(
    "https://openrouter.ai/api/v1/chat/completions",
    data=json.dumps(body).encode(),
    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    method="POST")
try:
    with urllib.request.urlopen(req, timeout=300) as r:
        res = json.loads(r.read())
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode(errors="replace"))
    sys.exit(1)

msg = res.get("choices", [{}])[0].get("message", {})
imgs = msg.get("images") or []
if not imgs:
    print("NO IMAGE. text:", (msg.get("content") or "")[:500])
    print("usage:", res.get("usage"))
    sys.exit(2)

url = imgs[0]["image_url"]["url"]
b64 = url.split(",", 1)[1]
with open(OUT, "wb") as f:
    f.write(base64.b64decode(b64))
print("SAVED", OUT)
print("usage:", res.get("usage"))
