#!/usr/bin/env python3
"""Pad a generated poster to an exact aspect ratio without cropping its content."""

import argparse
from pathlib import Path

from PIL import Image


def parse_ratio(value: str) -> tuple[int, int]:
    try:
        width, height = (int(part) for part in value.split(":", 1))
    except ValueError as error:
        raise argparse.ArgumentTypeError("ratio must look like 4:5") from error
    if width <= 0 or height <= 0:
        raise argparse.ArgumentTypeError("ratio values must be positive")
    return width, height


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pad an image to a target ratio while preserving every source pixel."
    )
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--ratio", type=parse_ratio, default=(4, 5))
    parser.add_argument("--background", default="#f7f3ef")
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGB")
    ratio_width, ratio_height = args.ratio
    target_ratio = ratio_width / ratio_height
    source_ratio = source.width / source.height

    if source_ratio < target_ratio:
        target_width = round(source.height * target_ratio)
        target_height = source.height
    else:
        target_width = source.width
        target_height = round(source.width / target_ratio)

    canvas = Image.new("RGB", (target_width, target_height), args.background)
    offset = ((target_width - source.width) // 2, (target_height - source.height) // 2)
    canvas.paste(source, offset)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.output, "PNG", optimize=True)
    print(f"SAVED {args.output} ({target_width}x{target_height})")


if __name__ == "__main__":
    main()
