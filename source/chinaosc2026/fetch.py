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
import base64
import json
import pathlib
import re
import struct
import time
import urllib.error
import urllib.parse
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


IMG_SRC = re.compile(rb'<img[^>]+src="([^"]+)"')


def encode_url(url: str) -> str:
    """Percent-encode an image URL's path.

    The CMS embeds asset filenames verbatim, so they contain Chinese characters
    ("王意洁_2026...png") and brace-wrapped GUIDs ("{3BF3CB47-...}_2026...png").
    Both are rejected by the gateway unless encoded. `%` stays safe so an already
    encoded URL is not double-encoded.
    """
    head, sep, path = url.partition("://")
    if not sep:
        return url
    host, _, rest = path.partition("/")
    return f"{head}://{host}/{urllib.parse.quote(rest, safe='/%?=&')}"


def png_size(data: bytes) -> tuple[int, int] | None:
    """Width/height of a PNG (the CMS serves PNG only), without Pillow."""
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", data[16:24])


def doc_html(doc: dict) -> bytes:
    """The document's rendered HTML — `content` is base64 in the CMS payload."""
    out = []

    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k == "content" and isinstance(v, str) and len(v) > 200:
                    out.append(v)
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)

    walk(doc)
    html = b""
    for blob in out:
        try:
            html += base64.b64decode(blob)
        except Exception:  # noqa: BLE001 — a non-base64 content field, use as-is
            html += blob.encode("utf-8", "replace")
    return html


def fetch_images() -> None:
    """Download every image the documents embed, and index them.

    The programme lives in these images: each forum's timetable is published as
    a table PNG (times, talk titles, speakers, affiliations) that exists nowhere
    in the CMS text. So the images are SOURCE, not decoration, and are fetched
    like any other source.

    Binaries stay out of git (see .gitignore, mirroring source/raw/images/) —
    they are deterministically re-fetchable from the URLs recorded here. What IS
    committed is images.json (the per-document index, in document order) and the
    parsed result under agenda/, so the build stays offline and deterministic.
    """
    img_dir = RAW / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    index: dict[str, list[dict]] = {}
    seen: dict[str, dict] = {}

    for doc_path in sorted((RAW / "docs").glob("*.json")):
        doc_id = doc_path.stem
        html = doc_html(json.loads(doc_path.read_text(encoding="utf-8")))
        entries = []
        for raw_url in IMG_SRC.findall(html):
            url = raw_url.decode("utf-8", "replace")
            name = url.rsplit("/", 1)[-1]
            if url in seen:  # the same asset repeats within and across documents
                entries.append(seen[url])
                continue
            dest = img_dir / name
            if not dest.exists():
                try:
                    req = urllib.request.Request(encode_url(url), headers=HEADERS)
                    with urllib.request.urlopen(req, timeout=60) as r:
                        dest.write_bytes(r.read())
                except Exception as e:  # noqa: BLE001
                    print(f"  ! {e} {url}")
                    continue
                time.sleep(0.05)
            size = png_size(dest.read_bytes()[:24]) or (0, 0)
            entry = {"file": name, "url": url, "w": size[0], "h": size[1]}
            seen[url] = entry
            entries.append(entry)
        if entries:
            index[doc_id] = entries

    save("images.json", index)
    n = len({e["file"] for v in index.values() for e in v})
    print(f"\nImages: {n} distinct across {len(index)} documents -> {img_dir}")


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
    fetch_images()


if __name__ == "__main__":
    main()
