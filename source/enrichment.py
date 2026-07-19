#!/usr/bin/env python3
"""Merge AI-generated derived enrichment (summary/topics) into built forum talks.

Enrichment is COMMITTED SOURCE authored during conference onboarding, kept in a
separate file from the verbatim-extracted content it annotates. It never edits
the source title/abstract — it only adds clearly-marked derived fields.

Storage: each conference keeps its enrichment at ``source/<id>/enrichment.json``,
a map from a STABLE talk id to ``{summary: {zh}, topics: [...]}``. The talk id is

    "<forum code>#<0-based index within that forum's talks[]>"

which is exactly the id the web app already uses for a talk
(see web/src/lib/follow-store.ts `talkId()` and ForumDetail.tsx `#talk-N`).

The build reads this file (if present) and merges, onto each matching talk:
  - ``summary``      -> {"zh": <authored>, "en": <null unless provided>}
  - ``topics``       -> list of controlled-vocabulary keys (see source/topics.json)
  - ``ai_generated`` -> True (provenance marker so the UI can label + toggle it)

Topics are validated against the controlled vocabulary so a typo fails the build
rather than silently minting an off-list tag. Both adapters call apply_enrichment.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOPICS_FILE = ROOT / "source" / "topics.json"


def load_topic_vocab():
    """The set of allowed topic keys from the controlled vocabulary."""
    data = json.loads(TOPICS_FILE.read_text())
    return {t["key"] for t in data["topics"]}


def load_enrichment(path):
    """Return the talk-id -> entry map from an enrichment file, or {} if absent."""
    p = pathlib.Path(path)
    if not p.exists():
        return {}
    data = json.loads(p.read_text())
    return data.get("talks", {})


def apply_enrichment(forums, path):
    """Merge derived summary/topics/ai_generated onto forum talks, in place.

    Keyed by "<forum code>#<0-based talk index>". Source fields are untouched.
    Returns (applied, summaries) counts. Raises on an unknown topic or an
    enrichment key that matches no talk (stale id), keeping the file honest.
    """
    talks_map = load_enrichment(path)
    if not talks_map:
        return 0, 0
    vocab = load_topic_vocab()
    seen = set()
    applied = 0
    summaries = 0
    for f in forums:
        code = f.get("code")
        for i, t in enumerate(f.get("talks", [])):
            key = f"{code}#{i}"
            entry = talks_map.get(key)
            if entry is None:
                continue
            seen.add(key)
            summary = entry.get("summary") or {}
            zh = summary.get("zh")
            bad = [tp for tp in entry.get("topics", []) if tp not in vocab]
            if bad:
                raise ValueError(
                    f"{path}: talk {key} has off-vocabulary topics {bad}; "
                    f"add them to source/topics.json or fix the tag"
                )
            t["summary"] = {"zh": zh, "en": summary.get("en")}
            t["topics"] = list(entry.get("topics", []))
            t["ai_generated"] = True
            applied += 1
            if zh:
                summaries += 1
    stale = set(talks_map) - seen
    if stale:
        raise ValueError(
            f"{path}: {len(stale)} enrichment id(s) match no talk (stale): "
            f"{sorted(stale)[:10]}"
        )
    return applied, summaries
