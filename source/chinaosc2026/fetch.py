#!/usr/bin/env python3
"""CCF ChinaOSC 2026 adapter, part 1 of 2: fetch.

The official site (https://chinaosc.ccf.org.cn/) is an umi/React SPA with only two
routes ("/" and "/information/detail/:id"); everything on screen comes from the
GitLink "zone" (专区) CMS behind https://gateway.gitlink.org.cn. The SPA picks its
zone from the four-digit year in the URL path, defaulting to the current year:

    2023 -> kydhgw (zoneId 6)          2025 -> china2025osc (zoneId 33)
    2024 -> china2024osc (zoneId 29)   2026 -> kydh2026     (zoneId 40)

so "/" serves the 2026 edition. Endpoints used here (all public, GET, JSON):

    /api/zone/open/zoneKey/<key>            zone metadata + 大会简介 prose
    /api/cms/doc/open/zone/<id>/dirList     CMS directories (议程详情/专题议程/…)
    /api/cms/doc/open/dir/<id>/docList      documents in a directory
    /api/cms/doc/open/<docId>               one document; `content` is base64 HTML
    /api/zone/open/<id>/member/overviewList people grouped by role (大会主席/与会嘉宾)
    /api/zone/open/<id>/partners/list       partner communities

Everything is written verbatim to raw/ (pretty-printed JSON, sorted keys) so
build.py can run deterministically offline.
"""
import json
import pathlib
import time
import urllib.error
import urllib.request

GATEWAY = "https://gateway.gitlink.org.cn"
ZONE_KEY = "kydh2026"
ZONE_ID = 40
RAW = pathlib.Path(__file__).resolve().parent / "raw"
HEADERS = {
    "User-Agent": "Mozilla/5.0 conf-scheduler/chinaosc-adapter",
    "Referer": "https://chinaosc.ccf.org.cn/",
}


def get(path: str):
    req = urllib.request.Request(GATEWAY + path, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        print(f"  ! {e.code} {path}")
        return None
    except Exception as e:  # noqa: BLE001
        print(f"  ! {e} {path}")
        return None


def save(rel: str, payload) -> None:
    p = RAW / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(payload, ensure_ascii=False, indent=1, sort_keys=True) + "\n",
                 encoding="utf-8")


def main() -> None:
    zone = get(f"/api/zone/open/zoneKey/{ZONE_KEY}")
    if zone is not None:
        save("zone.json", zone)

    for rel, path in [
        ("members.json", f"/api/zone/open/{ZONE_ID}/member/overviewList"),
        ("partners.json", f"/api/zone/open/{ZONE_ID}/partners/list"),
    ]:
        payload = get(path)
        if payload is not None:
            save(rel, payload)

    dirs = get(f"/api/cms/doc/open/zone/{ZONE_ID}/dirList")
    if dirs is None:
        print("! dirList unavailable; aborting")
        return
    save("dirs.json", dirs)

    total = 0
    for d in dirs.get("rows", []):
        # docOverviewList truncates each directory to 5 entries, so page the
        # per-directory docList instead to get the full listing.
        listing = get(f"/api/cms/doc/open/dir/{d['id']}/docList?pageNum=1&pageSize=200")
        if listing is None:
            continue
        save(f"doclist/{d['id']}.json", listing)
        rows = listing.get("rows") or []
        print(f"{d['id']} {d['name']}: {len(rows)} docs")
        for row in rows:
            doc = get(f"/api/cms/doc/open/{row['id']}")
            if doc is not None:
                save(f"docs/{row['id']}.json", doc)
                total += 1
            time.sleep(0.05)
    print(f"\nTotal documents: {total}")


if __name__ == "__main__":
    main()
