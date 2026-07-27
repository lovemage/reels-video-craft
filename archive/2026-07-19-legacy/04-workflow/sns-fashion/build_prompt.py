#!/usr/bin/env python3
"""Build a complete SNS-fashion image prompt from shared rules and a graphic direction."""

import argparse
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DIRECTIONS = {
    "giant-type": "巨型文字：最強的滑動停留鉤子，適合作為預設。",
    "editorial-cover": "雜誌封面：資訊節奏更完整，適合內容型貼文。",
    "urban-signal": "城市訊號：動態街頭感，適合清邁生活與 Reels 首圖。",
    "repetition-grid": "重複分割：系列辨識度最高，適合輪播封面。",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Combine the SNS-fashion base prompt with one graphic direction."
    )
    parser.add_argument("--direction", choices=DIRECTIONS, default="giant-type")
    parser.add_argument(
        "--output",
        type=Path,
        help="Write the assembled prompt here. Omit to print it to standard output.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base = (ROOT / "base.prompt.txt").read_text(encoding="utf-8").strip()
    direction = (ROOT / "directions" / f"{args.direction}.prompt.txt").read_text(
        encoding="utf-8"
    ).strip()
    prompt = f"{base}\n\n## 選用圖形方向：{args.direction}\n\n{direction}\n"

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(prompt, encoding="utf-8")
        print(f"SAVED {args.output} ({args.direction})")
    else:
        print(prompt, end="")


if __name__ == "__main__":
    main()
