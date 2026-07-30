#!/usr/bin/env python3
"""Turn a voiceover into a mouth-state track.

Reads a mono/stereo PCM WAV (the same file that anchors the video timeline),
measures per-frame RMS, and emits the frames at which the mouth state changes.
Only changes are emitted, not every frame — a 26s narration collapses to ~140
entries, which is a manageable number of timeline sets.

  python3 mouth_track.py voiceover.wav --fps 30 --frames 773 > mouth.json

States: 0 closed (draw no overlay) / 1 small / 2 medium.
Thresholds are fractions of the take's own peak RMS, so a quiet or loud
recording tracks the same way — do not switch to absolute dBFS.

Stdlib only (wave + array): no numpy, so this runs anywhere the kit does.
"""
import argparse
import array
import json
import math
import sys
import wave
from collections import Counter


def frame_rms(path, fps, want_frames):
    with wave.open(path, "rb") as w:
        if w.getsampwidth() != 2:
            sys.exit(f"expected 16-bit PCM, got {w.getsampwidth() * 8}-bit — convert with ffmpeg first")
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        data = array.array("h")
        data.frombytes(w.readframes(n))
    if ch > 1:  # collapse to mono; lip-sync has no use for the stereo image
        data = array.array("h", [sum(data[i : i + ch]) // ch for i in range(0, len(data), ch)])
        n = len(data)
    total = want_frames or math.ceil(n / sr * fps)
    spf = sr / fps
    out = []
    for f in range(total):
        a, b = int(f * spf), min(int((f + 1) * spf), n)
        if b <= a:
            out.append(0.0)
            continue
        out.append(math.sqrt(sum(v * v for v in data[a:b]) / (b - a)) / 32768.0)
    return out, sr, n / sr


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("wav")
    ap.add_argument("--fps", type=float, default=30)
    ap.add_argument("--frames", type=int, default=None, help="force the frame count to match the composition")
    ap.add_argument("--silence", type=float, default=0.055, help="fraction of peak below which the mouth closes")
    ap.add_argument("--open", type=float, default=0.30, help="fraction of peak above which the mouth opens wide")
    a = ap.parse_args()

    rms, sr, dur = frame_rms(a.wav, a.fps, a.frames)
    peak = max(rms) or 1.0
    lv = [0 if v / peak < a.silence else (1 if v / peak < a.open else 2) for v in rms]

    # Absorb single-frame spikes. Without this the mouth strobes on consonants:
    # one frame of "wide" between two "small" frames is not a visible gesture at
    # 30fps, it is a flicker.
    for i in range(1, len(lv) - 1):
        if lv[i] != lv[i - 1] and lv[i] != lv[i + 1]:
            lv[i] = lv[i - 1]

    changes = [[0, lv[0]]]
    for i in range(1, len(lv)):
        if lv[i] != lv[i - 1]:
            changes.append([i, lv[i]])

    dist = Counter(lv)
    print(
        json.dumps(
            {
                "source": a.wav,
                "sampleRate": sr,
                "duration": round(dur, 6),
                "fps": a.fps,
                "frames": len(lv),
                "peakRms": round(peak, 4),
                "distribution": {"closed": dist[0], "small": dist[1], "medium": dist[2]},
                "changes": changes,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    pct = 100 * dist[0] / len(lv)
    print(
        f"# {len(changes)} changes, {pct:.0f}% closed",
        file=sys.stderr,
    )
    if pct > 45:
        print("# WARNING: mostly closed — check --silence against this take", file=sys.stderr)


if __name__ == "__main__":
    main()
