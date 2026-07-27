#!/usr/bin/env python3
import base64, json, os, sys, time, urllib.request, urllib.error

ROOT = "/home/ivan-bai/projects/seedance"
SP = "/tmp/claude-1000/-home-ivan-bai-projects-seedance/4a77027a-a556-41c5-8de9-3511739975c7/scratchpad"
PROMPT_FILE = os.environ.get("PROMPT_FILE", os.path.join(SP, "prompt.txt"))
DURATION = int(os.environ.get("DURATION", "12"))
ASPECT = os.environ.get("ASPECT", "9:16")
CAMERA_FIXED = os.environ.get("CAMERA_FIXED", "0") not in ("0", "", "false", "False")
FIRST_FRAME = os.environ.get("FIRST_FRAME")   # 可選：首幀圖路徑（如四宮格 image.png）
LAST_FRAME = os.environ.get("LAST_FRAME")     # 可選：末幀圖路徑（需搭配首幀）

# --- load OpenRouter key from .env ---
key = None
with open(os.path.join(ROOT, ".env")) as f:
    for line in f:
        line = line.strip()
        if line.startswith("OPENROUTER_API_KEY="):
            key = line.split("=", 1)[1].strip().strip('"').strip("'")
if not key:
    sys.exit("OPENROUTER_API_KEY not found in .env")

with open(PROMPT_FILE, encoding="utf-8") as f:
    prompt = f.read()

body = {
    "model": "bytedance/seedance-2.0-fast",
    "prompt": prompt,
    "duration": DURATION,
    "resolution": "720p",
    "aspect_ratio": ASPECT,
    "camera_fixed": CAMERA_FIXED,
    "generate_audio": True,
}

# 可選首幀圖（如四宫格 image.png）；插畫圖可過 Seedance 審核（真人照片會被挡）。
# 注意：一旦提供首帧，输出比例通常跟随图片比例，aspect_ratio 可能被忽略。
def _frame(path, frame_type):
    ext = os.path.splitext(path)[1].lstrip(".").lower() or "png"
    mime = "jpeg" if ext in ("jpg", "jpeg") else ext
    with open(path, "rb") as f:
        b = base64.b64encode(f.read()).decode()
    return {"type": "image_url", "frame_type": frame_type,
            "image_url": {"url": f"data:image/{mime};base64,{b}"}}

frames = []
if FIRST_FRAME:
    frames.append(_frame(FIRST_FRAME, "first_frame"))
if LAST_FRAME:
    frames.append(_frame(LAST_FRAME, "last_frame"))
if frames:
    body["frame_images"] = frames

def post(url, payload):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())

def get(url):
    if not url.startswith("http"):
        url = "https://openrouter.ai" + url
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())

print(f"Submitting to bytedance/seedance-2.0-fast ({DURATION}s, {ASPECT}, 720p, camera_fixed={CAMERA_FIXED}, first_frame={bool(FIRST_FRAME)}, last_frame={bool(LAST_FRAME)})...", flush=True)
try:
    res = post("https://openrouter.ai/api/v1/videos", body)
except urllib.error.HTTPError as e:
    print("HTTP", e.code, e.read().decode(errors="replace"))
    sys.exit(1)

print("SUBMIT_RESPONSE:", json.dumps(res, ensure_ascii=False), flush=True)
vid_id = res.get("id")
poll = res.get("polling_url") or (f"/api/v1/videos/{vid_id}" if vid_id else None)
if not poll:
    sys.exit("no polling url")

for i in range(120):  # up to ~10 min
    time.sleep(5)
    try:
        st = get(poll)
    except urllib.error.HTTPError as e:
        print("poll HTTP", e.code, e.read().decode(errors="replace"))
        continue
    status = st.get("status")
    print(f"[{i}] status={status}", flush=True)
    if status in ("completed", "succeeded", "success"):
        print("RESULT:", json.dumps(st, ensure_ascii=False))
        break
    if status in ("failed", "error", "canceled"):
        print("FAILED:", json.dumps(st, ensure_ascii=False))
        break
