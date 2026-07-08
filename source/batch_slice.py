#!/usr/bin/env python3
"""Slice one or more forum posters into readable vertical tiles (default 3200px tall,
which downsamples to ~2000px display and stays legible for these large-font posters).

Usage: python3 batch_slice.py CF02 CF03 ...   (no args = all forums missing detail)
Prints, per forum, the tile paths so they can be read visually.
"""
import json, sys, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
forum_imgs = {x["code"]: x for x in json.loads((ROOT / "extracted" / "forum_images.json").read_text())}
detail_dir = ROOT.parent / "data" / "forums_detail"

codes = sys.argv[1:]
if not codes:
    done = {p.stem for p in detail_dir.glob("CF*.json")}
    codes = [c for c in sorted(forum_imgs) if c not in done]

for code in codes:
    img = forum_imgs[code]["poster_images"][0]
    out = subprocess.run(
        ["python3", str(ROOT / "slice_poster.py"), img, "3200", "140"],
        capture_output=True, text=True, cwd=ROOT,
    )
    print(out.stdout.strip())
    print()
