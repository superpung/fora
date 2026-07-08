#!/usr/bin/env python3
"""把超长论坛海报切成等高竖条，便于视觉逐块阅读。
用法: python3 slice_poster.py <image_path> [tile_height=2200] [overlap=120]
输出到 tiles/<basename>/NN.png
"""
import sys, pathlib
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

def main():
    src = pathlib.Path(sys.argv[1])
    th = int(sys.argv[2]) if len(sys.argv) > 2 else 2200
    ov = int(sys.argv[3]) if len(sys.argv) > 3 else 120
    im = Image.open(src).convert("RGB")
    W, H = im.size
    outdir = pathlib.Path("tiles") / src.stem
    outdir.mkdir(parents=True, exist_ok=True)
    y, i = 0, 0
    idx = []
    while y < H:
        box = (0, max(0, y - (ov if y else 0)), W, min(H, y + th))
        tile = im.crop(box)
        p = outdir / f"{i:02d}.png"
        tile.save(p)
        idx.append((str(p), box[1], box[3]))
        y += th
        i += 1
    print(f"{src.name} {W}x{H} -> {i} tiles in {outdir}")
    for p, a, b in idx:
        print(f"  {p}  y[{a}:{b}]")

if __name__ == "__main__":
    main()
