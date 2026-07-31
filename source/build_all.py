#!/usr/bin/env python3
"""Rebuild every conference dataset, then the shared manifest.

This is THE build entry point — for CI and for humans. It contains no
per-conference knowledge, so adding a conference never means editing CI again.

Discovery is by convention: each conference owns `source/<id>/build.py`, and
this script runs every one it finds, sorted by path so the order is stable. Drop
in a new `source/<id>/build.py` and it is picked up automatically.

The manifest runs last, because it indexes the conference files the builders
have just written.

    uv run python source/build_all.py
"""
import pathlib, subprocess, sys

SRC = pathlib.Path(__file__).resolve().parent
ROOT = SRC.parent


def conference_builders() -> list[pathlib.Path]:
    """Every `source/<id>/build.py`, sorted — the conference build entry points."""
    return sorted(SRC.glob("*/build.py"))


def run(script: pathlib.Path) -> None:
    print(f"\n=== {script.relative_to(ROOT)} ===", flush=True)
    # cwd=ROOT so the builders' repo-relative output paths resolve the same way
    # whether this runs from the repo root or anywhere else.
    subprocess.run([sys.executable, str(script)], check=True, cwd=ROOT)


def main() -> int:
    builders = conference_builders()
    if not builders:
        print("no conference builders found (expected source/<id>/build.py)", file=sys.stderr)
        return 1
    for script in builders:
        run(script)
    run(SRC / "build_manifest.py")
    print(f"\nrebuilt {len(builders)} conference(s):",
          ", ".join(p.parent.name for p in builders))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
