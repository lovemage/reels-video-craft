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

body = {
    "model": MODEL,
    "messages": [{"role": "user", "content": prompt}],
    "modalities": ["image", "text"],
}

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
