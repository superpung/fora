#!/usr/bin/env python3
"""Assign persistent report identities from a reviewed, append-only registry.

IDs were seeded from the v0.4.0 programme so existing bookmarks remain valid.
Their numeric suffixes are allocation numbers, NEVER current list positions.
Changed titles/credits require an explicit registry selector update; unmatched
reports fail closed rather than acquiring the identity of an adjacent report.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRIES = ROOT / "source" / "identities"


def signature(talk):
    return {"title": (talk.get("title") or {}).get("zh"),
            "speakers": [p.get("name") for p in talk.get("speakers", [])],
            "type": talk.get("type")}


def context(talk, date=None):
    result = {"date": talk.get("day_date", date), "start": talk.get("start"), "end": talk.get("end")}
    section = (talk.get("extra") or {}).get("source_section")
    if section:
        result["source_section"] = section
    return result


def load_registry(conference_id):
    path = REGISTRIES / f"{conference_id}.json"
    if not path.exists():
        raise ValueError(f"Missing identity registry: {path}; register the reviewed programme first")
    registry = json.loads(path.read_text())
    ids = [entry["id"] for entry in registry["reports"]]
    if len(ids) != len(set(ids)):
        raise ValueError(f"{path}: duplicate persistent IDs")
    return registry


def assign(talk, scope, registry, used, date=None):
    candidates = [entry for entry in registry["reports"]
                  if entry["scope"] == scope and signature(talk) in entry["selectors"]]
    if len(candidates) > 1:
        candidates = [entry for entry in candidates if entry.get("context") == context(talk, date)]
    if len(candidates) != 1 or candidates[0]["id"] in used:
        raise ValueError(f"Unresolved report identity in {scope}: {signature(talk)}; "
                         "review source/identities registry, retain IDs for edits and allocate fresh IDs for additions")
    entry = candidates[0]
    used.add(entry["id"])
    talk["id"] = entry["id"]


def assign_forums(forums, conference_id):
    registry = load_registry(conference_id)
    used = set()
    for forum in forums:
        for talk in forum.get("talks", []):
            assign(talk, forum["code"], registry, used, forum.get("day_date"))


def assign_conference(conference):
    registry = load_registry(conference["id"])
    used = set()
    for forum in conference.get("forums", []):
        for talk in forum.get("talks", []):
            assign(talk, forum["code"], registry, used, forum.get("day_date"))
    for day in conference.get("days", []):
        for block in day.get("blocks", []):
            if block.get("kind") == "keynotes":
                for talk in block.get("talks", []):
                    assign(talk, "KEYNOTE", registry, used, day["date"])
    conference.setdefault("extra", {})["identity_version"] = 1
    return conference


def finalize():
    for path in sorted((ROOT / "data").glob("*.json")):
        conference = assign_conference(json.loads(path.read_text()))
        payload = json.dumps(conference, ensure_ascii=False, indent=2) + "\n"
        path.write_text(payload)


if __name__ == "__main__":
    finalize()
