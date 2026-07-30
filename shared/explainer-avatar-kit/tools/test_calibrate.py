#!/usr/bin/env python3
"""Regression test for the anchor calibrator.

The ground truth here was read by eye off zoomed grid overlays and then
confirmed by compositing the mouth at 1:1 and looking at it. It is the reason
this rig can be reused without re-deriving anchors, so it is worth protecting:
if a change to calibrate.py moves any of these, the anchors in anchors.json are
no longer the ones that were visually approved.

Tolerance is 1 source pixel. The outward walk is seed-sensitive at the
half-pixel level (a seed 2px away can land the centre 0.5px off), which is
~0.2px once scaled onto a canvas — below anything visible.

  python3 tools/test_calibrate.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from calibrate import load_flat, measure  # noqa: E402

TOL = 1.0

# pose, seed, expected lip_x / lip_y / lip_w / scale_landmark_to_lip
CASES = [
    ("gestures/03-present-open-palm.png", (555, 382), 557.5, 382.0, 85, 35),
    ("gestures/04-explain-both-palms.png", (510, 382), 510.5, 382.0, 77, 35),
    ("gestures/06-thumbs-up.png", (593, 312), 593.0, 312.1, 72, 35),
    ("gestures/08-tech-demo.png", (477, 409), 477.0, 409.0, 82, 36),
    ("expressions/07-worried-concerned.png", (796, 501), 794.5, 501.3, 111, 52),
]


def main():
    failed = 0
    for pose, seed, ex, ey, ew, es in CASES:
        got = measure(load_flat(pose), seed)
        checks = [
            ("lip_x", got["lip_x"], ex),
            ("lip_y", got["lip_y"], ey),
            ("lip_w", got["lip_w"], ew),
            ("scale_landmark_to_lip", got["scale_landmark_to_lip"], es),
        ]
        bad = [(k, g, e) for k, g, e in checks if g is None or abs(g - e) > TOL]
        status = "ok" if not bad else "FAIL"
        print(f"{status:4s} {pose}")
        for k, g, e in bad:
            print(f"       {k}: got {g}, expected {e} (±{TOL})")
        failed += bool(bad)

    # The four gesture plates must keep sharing a head scale — this is what
    # makes a single stand-shot scale correct for all of them.
    spread = [measure(load_flat(p), s)["scale_landmark_to_lip"] for p, s, *_ in CASES[:4]]
    if max(spread) - min(spread) > 1:
        print(f"FAIL gesture plates no longer share a head scale: {spread}")
        failed += 1
    else:
        print(f"ok   gesture plates share a head scale: {spread}")

    print("\nFAILED" if failed else "\nall passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
