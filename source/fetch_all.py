#!/usr/bin/env python3
"""Crawl all channel content of CCF Chip 2026 (ccf.org.cn/ccfchip2026) to disk.

Data sources (jsonp APIs, require a Referer to the conference page):
  1. getMeetingIdByMeetingShort.action  short name -> meetingId
  2. api/show.action code=api_channel    -> channel tree
  3. api/newsAll.action channelId=<id>   -> articles for that channel (incl. the
                                            MAIN_BODY rich text)
"""
import json, re, time, urllib.parse, urllib.request, pathlib, sys

BASE = "https://ccf.org.cn"
SHORT = "ccfchip2026"
REFERER = f"{BASE}/{SHORT}"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

ROOT = pathlib.Path(__file__).resolve().parent
RAW = ROOT / "raw"
API = RAW / "api"
CHAN_DIR = API / "channels"
IMG_DIR = RAW / "images"
FILE_DIR = RAW / "files"
for d in (API, CHAN_DIR, IMG_DIR, FILE_DIR):
    d.mkdir(parents=True, exist_ok=True)


def post(path, data):
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(BASE + path, data=body,
                                 headers={"User-Agent": UA, "Referer": REFERER,
                                          "Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


def unjsonp(s):
    s = s.strip()
    s = re.sub(r"^[A-Za-z_$][\w$]*\s*\(", "", s)
    s = re.sub(r"\)\s*;?\s*$", "", s)
    return json.loads(s)


def get_bin(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": REFERER})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    # 1. meetingId
    mid = post("/api/getMeetingIdByMeetingShort.action",
               {"meetingShort": SHORT, "jsoncallback": "cb"})
    mid = json.loads(mid)["data"]
    print("meetingId:", mid)

    # 2. channel tree
    chan_raw = post("/api/show.action",
                    {"code": "api_channel", "meetingId": mid, "jsoncallback": "cb"})
    chan = unjsonp(chan_raw)
    (API / "chan.json").write_text(json.dumps(chan, ensure_ascii=False, indent=1))

    channels = []
    for block in chan:
        if isinstance(block, dict):
            for k, v in block.items():
                if isinstance(v, list):
                    for n in v:
                        if isinstance(n, dict) and n.get("ID"):
                            channels.append(n)
    print("channels:", len(channels))

    # 3. fetch each channel's articles
    manifest = {"meetingId": mid, "channels": []}
    assets = set()
    for i, ch in enumerate(channels, 1):
        cid = ch["ID"]
        name = ch.get("CHANNEL_NAME")
        try:
            raw = post("/api/newsAll.action", {"channelId": cid, "jsoncallback": "cb"})
            arts = unjsonp(raw)
        except Exception as e:
            print(f"  [{i}] {name} FAIL {e}")
            arts = None
        (CHAN_DIR / f"{cid}.json").write_text(
            json.dumps(arts, ensure_ascii=False, indent=1))
        nimg = 0
        if isinstance(arts, list):
            body = " ".join(a.get("MAIN_BODY", "") or "" for a in arts)
            for m in re.finditer(r'(?:src|href)=["\x27]([^"\x27]+)', body):
                u = m.group(1)
                if "UeditorImg" in u or "UeditorAttach" in u or "cmsFileManager" in u or "download.action" in u:
                    assets.add(u)
                    if re.search(r'\.(png|jpe?g|gif)', u, re.I):
                        nimg += 1
        manifest["channels"].append({
            "id": cid, "name": name, "name_en": ch.get("CHANNEL_NAME_EN"),
            "lev": ch.get("LEV"), "super": ch.get("SUPER_CHANNEL"),
            "type": ch.get("COLUMN_TYPE"), "sort": ch.get("SORT"),
            "n_articles": len(arts) if isinstance(arts, list) else 0,
            "n_images": nimg,
        })
        print(f"  [{i:2}] {name:<28} arts={len(arts) if isinstance(arts,list) else 'ERR':<3} imgs={nimg}")
        time.sleep(0.15)

    # 4. download all referenced assets
    print("assets referenced:", len(assets))
    asset_map = {}
    for u in sorted(assets):
        full = u if u.startswith("http") else BASE + (u if u.startswith("/") else "/" + u)
        # decide filename
        if "download.action" in u:
            q = urllib.parse.parse_qs(urllib.parse.urlparse(u).query)
            fn = urllib.parse.unquote(q.get("realFileName", ["file"])[0])
            outdir = FILE_DIR
        else:
            fn = u.split("/")[-1].split("?")[0]
            outdir = IMG_DIR
        try:
            data = get_bin(full)
            (outdir / fn).write_bytes(data)
            asset_map[u] = str((outdir / fn).relative_to(ROOT))
            print(f"   saved {fn} ({len(data)}B)")
        except Exception as e:
            print(f"   FAIL {u} {e}")
        time.sleep(0.1)

    manifest["assets"] = asset_map
    (API / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print("DONE. manifest ->", API / "manifest.json")


if __name__ == "__main__":
    main()
