#!/usr/bin/env python3
"""Calibrate a mouth anchor for one avatar plate.

Fully automatic landmark detection was tried and rejected: on stylised
line-art the glasses, hair and collar defeat threshold heuristics — a sweep
over all 16 plates failed outright on 7 and returned wrong values on 3 of the
remaining 5 (checked against hand-verified ground truth). A tool that silently
emits wrong anchors is worse than none, because the whole point of the rig is
that the next project trusts these numbers.

So this is seeded: you read a rough mouth position off a labelled grid, and the
tool refines it to sub-pixel precision. The refinement step matched the
hand-read value on all five plates used in production.

  1. grid     python3 calibrate.py grid gestures/03-present-open-palm.png
              -> /tmp/calib-grid.png, a labelled overlay. Read off roughly
                 where the lip line sits.
  2. measure  python3 calibrate.py measure gestures/03-...png --seed 555,383
              -> precise lip_x / lip_y / lip_w + the scale landmark.
  3. proof    python3 calibrate.py proof gestures/03-...png --seed 555,383 \
                                          --canvas-width 430
              -> /tmp/calib-proof.png, the three mouth states composited at
                 final on-canvas size. ALWAYS look at this: numbers that
                 validate can still land on the wrong feature.

All coordinates are SOURCE pixels. Canvas placement is derived per project.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw

KIT = Path(__file__).resolve().parent.parent
DARK_LIP = 85
SS = 4  # supersample for the proof render


def load_flat(rel, bg=(255, 255, 255)):
    p = rel if Path(rel).is_absolute() else KIT / rel
    im = Image.open(p).convert("RGBA")
    plate = Image.new("RGBA", im.size, (*bg, 255))
    plate.alpha_composite(im)
    return plate.convert("RGB")


def luma(px, x, y):
    r, g, b = px[x, y]
    return 0.299 * r + 0.587 * g + 0.114 * b


def cmd_grid(a):
    im = load_flat(a.pose)
    y1 = a.bottom or int(im.height * 0.38)
    crop = im.crop((0, 0, im.width, y1))
    d = ImageDraw.Draw(crop)
    for x in range(0, crop.width, 50):
        d.line([(x, 0), (x, crop.height)], fill=(255, 0, 0) if x % 200 == 0 else (0, 200, 0))
        if x % 100 == 0:
            d.text((x + 2, 2), str(x), fill=(255, 0, 0))
    for y in range(0, crop.height, 50):
        d.line([(0, y), (crop.width, y)], fill=(255, 0, 0) if y % 200 == 0 else (0, 200, 0))
        if y % 100 == 0:
            d.text((2, y + 2), str(y), fill=(255, 0, 0))
    crop.save(a.out)
    print(f"{a.out}  ({crop.width}x{crop.height})  read the lip line, pass it as --seed x,y")


def measure(im, seed):
    """Refine a rough seed into the lip line's centre, baseline and width.

    Walks outward from the seed column and stops at a 7px gap, so hair or a
    collar touching the same row cannot extend the measurement.
    """
    px = im.load()
    cx, cy = seed

    def column(x):
        best = None
        for y in range(cy - 10, cy + 11):
            L = luma(px, x, y)
            if L < DARK_LIP and (best is None or L < best[1]):
                best = (y, L)
        return best

    ys, edges = [], []
    for step in (1, -1):
        x, gap, edge = cx, 0, cx
        while gap < 7 and 0 < x < im.width - 1:
            c = column(x)
            if c:
                edge, gap = x, 0
                ys.append(c[0])
            else:
                gap += 1
            x += step
        edges.append(edge)
    x1, x0 = edges
    lip_y = sum(ys) / len(ys) if ys else float(cy)

    # Scale landmark: walking up from the lip, the first sustained dark band.
    # Empirically the nose-base shadow. Its distance to the lip line came out
    # at 36/35/35/36 px on the four gesture plates and 52 px on the expression
    # plate — i.e. constant within a rig, so it works as a head-size ratio.
    # Interpupillary distance would be the textbook normaliser, but the glasses
    # frames are not reliably separable from the hair on these plates.
    half = int(0.11 * im.width)
    band = None
    for y in range(cy - 35, cy - 200, -1):
        if y < 2:
            break
        n = [sum(1 for x in range(cx - half, cx + half) if luma(px, x, y - k) < 60) for k in range(3)]
        if all(v >= 6 for v in n):
            band = y
            break
    return {
        "lip_x": round((x0 + x1) / 2, 1),
        "lip_y": round(lip_y, 1),
        "lip_w": x1 - x0,
        "scale_landmark_to_lip": round(cy - band, 1) if band else None,
    }


def cmd_measure(a):
    im = load_flat(a.pose)
    seed = tuple(int(v) for v in a.seed.split(","))
    rec = {"width": im.width, "height": im.height}
    rec.update(measure(im, seed))
    print(json.dumps(rec, ensure_ascii=False, indent=2))


# --- mouth geometry: shared with the runtime, keep in sync with rig.json -----
RIG = {
    "stand": {"small": (0.70, 0.15, False), "medium": (0.79, 0.24, True)},
    "close": {"small": (0.81, 0.11, False), "medium": (0.78, 0.23, True)},
}
INK, TEETH = (36, 26, 26, 255), (230, 219, 210, 255)


def draw_mouth(im, cx, lip_y, w, h, teeth):
    """Cavity opens DOWNWARD from the drawn upper-lip line, the way a mouth
    actually moves. Closed state draws nothing — the plate's own mouth shows."""
    layer = Image.new("RGBA", (im.width * SS, im.height * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    X, Y, W, H = cx * SS, lip_y * SS, w * SS, h * SS
    d.ellipse([X - W / 2, Y - 0.30 * H, X + W / 2, Y + 0.70 * H], fill=INK)
    if teeth and H > 8 * SS:
        d.ellipse([X - 0.34 * W, Y - 0.22 * H, X + 0.34 * W, Y + 0.02 * H], fill=TEETH)
    out = im.convert("RGBA")
    out.alpha_composite(layer.resize(im.size, Image.LANCZOS))
    return out.convert("RGB")


def cmd_proof(a):
    im = load_flat(a.pose, bg=(243, 246, 245))
    seed = tuple(int(v) for v in a.seed.split(","))
    m = measure(im, seed)
    scale = a.canvas_width / im.width
    spec = RIG[a.rig]
    shots = [("closed (native)", im)]
    for name in ("small", "medium"):
        fw, fh, teeth = spec[name]
        shots.append((name, draw_mouth(im, m["lip_x"], m["lip_y"], fw * m["lip_w"], fh * m["lip_w"], teeth)))

    # crop the head, render at TRUE final size and at 2x
    cw = int(2.6 * m["lip_w"])
    box = (int(m["lip_x"] - cw / 2), int(m["lip_y"] - 1.9 * cw), int(m["lip_x"] + cw / 2), int(m["lip_y"] + 0.5 * cw))
    tiles = []
    for name, img in shots:
        small = img.resize((a.canvas_width, round(im.height * scale)), Image.LANCZOS)
        b = tuple(round(v * scale) for v in box)
        head = small.crop(b)
        tiles.append((name, head))
    tw = max(t[1].width for _, t in tiles) * 2 + 20
    th = max(t[1].height for _, t in tiles) * 3 + 40
    sheet = Image.new("RGB", (tw * len(tiles), th), (243, 246, 245))
    for i, (name, head) in enumerate(tiles):
        sheet.paste(head, (i * tw + 10, 10))
        big = head.resize((head.width * 2, head.height * 2), Image.LANCZOS)
        sheet.paste(big, (i * tw + 10, head.height + 20))
        ImageDraw.Draw(sheet).text((i * tw + 10, th - 16), name, fill=(16, 28, 36))
    sheet.save(a.out)
    print(json.dumps(m, ensure_ascii=False))
    print(f"{a.out}  top row = true 1:1 size, bottom row = 2x. Judge at 1:1.")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("grid", help="labelled overlay for reading a seed")
    g.add_argument("pose")
    g.add_argument("--bottom", type=int, default=None)
    g.add_argument("--out", default="/tmp/calib-grid.png")
    g.set_defaults(func=cmd_grid)

    m = sub.add_parser("measure", help="refine a seed into a precise anchor")
    m.add_argument("pose")
    m.add_argument("--seed", required=True, metavar="X,Y")
    m.set_defaults(func=cmd_measure)

    p = sub.add_parser("proof", help="composite the mouth states at final size")
    p.add_argument("pose")
    p.add_argument("--seed", required=True, metavar="X,Y")
    p.add_argument("--canvas-width", type=int, required=True, help="the plate's width on the video canvas")
    p.add_argument("--rig", choices=("stand", "close"), default="stand")
    p.add_argument("--out", default="/tmp/calib-proof.png")
    p.set_defaults(func=cmd_proof)

    a = ap.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
