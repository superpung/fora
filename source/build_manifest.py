#!/usr/bin/env python3
"""Regenerate web/src/data/manifest.json from every per-conference dataset under
web/src/data/conferences/.

Conference-agnostic: run this after adding or updating ANY conference so the web
app's hub and switcher pick it up, without loading a full dataset. This is a
generic step, independent of how each conference was parsed.
"""
import json, pathlib, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONF_DIR = ROOT / "web" / "src" / "data" / "conferences"
MANIFEST = ROOT / "web" / "src" / "data" / "manifest.json"


def git_updated(path):
    """Last-committed date (YYYY-MM-DD) of a dataset file — the conference's data
    'last updated' time. Falls back to None when git history is unavailable."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", str(path)],
            cwd=ROOT, capture_output=True, text=True, timeout=10,
        )
        s = out.stdout.strip()
        return s[:10] if s else None
    except Exception:
        return None


def manifest_entry(d, path):
    venues = d.get("venues") or []
    main_v = next((v for v in venues if v.get("type") == "main"), None) or (venues[0] if venues else {})
    keynotes = sum(
        1
        for day in d.get("days", [])
        for b in day.get("blocks", [])
        if b.get("kind") == "keynotes"
        for t in (b.get("talks") or [])
        if t.get("type") == "keynote"
    )
    entry = {
        "id": d["id"],
        "name": d["name"],
        "edition": d.get("edition"),
        "start_date": d["start_date"],
        "end_date": d["end_date"],
        "city": (main_v or {}).get("city"),
        "venue": ((main_v or {}).get("name") or {}).get("zh"),
        "forums": len(d.get("forums", [])),
        "keynotes": keynotes,
        "days": len(d.get("days", [])),
    }
    updated = git_updated(path)
    if updated:
        entry["updated_at"] = updated
    return entry


def build_manifest():
    entries = [manifest_entry(json.loads(p.read_text()), p) for p in sorted(CONF_DIR.glob("*.json"))]
    entries.sort(key=lambda m: m["id"])  # deterministic; the UI sorts for display
    MANIFEST.write_text(json.dumps(entries, ensure_ascii=False, indent=2))
    return entries


if __name__ == "__main__":
    entries = build_manifest()
    print("wrote", MANIFEST, f"({len(entries)} conferences)")
