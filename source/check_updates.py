#!/usr/bin/env python3
"""ccfchip2026 update check (read-only): re-fetch the channel JSON from the live
site and diff against the saved raw/api/channels/*.json, without re-downloading
any images/posters. Reports channel/article/asset changes so we can tell whether
the official agenda has been updated since the last crawl."""
import json, re, time, urllib.parse, urllib.request, pathlib, hashlib

BASE = "https://ccf.org.cn"
SHORT = "ccfchip2026"
REFERER = f"{BASE}/{SHORT}"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
ROOT = pathlib.Path(__file__).resolve().parent
CHAN_DIR = ROOT / "raw" / "api" / "channels"


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


def assets_of(arts):
    out = set()
    if isinstance(arts, list):
        body = " ".join((a.get("MAIN_BODY", "") or "") for a in arts)
        for m in re.finditer(r'(?:src|href)=["\x27]([^"\x27]+)', body):
            u = m.group(1)
            if any(k in u for k in ("UeditorImg", "UeditorAttach", "cmsFileManager", "download.action")):
                out.add(u)
    return out


def art_sig(a):
    # a stable content signature per article: title + body + a few structured fields
    keys = ("TITLE", "MAIN_BODY", "NAME_INFO", "MAIN_INFO", "INTRODUCTION", "FILE_", "UPDATE_TIME")
    blob = "".join(str(a.get(k, "")) for k in keys)
    return hashlib.sha256(blob.encode("utf-8", "replace")).hexdigest()[:16]


def main():
    mid = json.loads(post("/api/getMeetingIdByMeetingShort.action",
                          {"meetingShort": SHORT, "jsoncallback": "cb"}))["data"]
    chan = unjsonp(post("/api/show.action",
                        {"code": "api_channel", "meetingId": mid, "jsoncallback": "cb"}))
    channels = []
    for block in chan:
        if isinstance(block, dict):
            for v in block.values():
                if isinstance(v, list):
                    for n in v:
                        if isinstance(n, dict) and n.get("ID"):
                            channels.append(n)

    live_ids = {c["ID"] for c in channels}
    saved_ids = {p.stem for p in CHAN_DIR.glob("*.json")}
    print(f"meetingId: {mid}  ({'UNCHANGED' if mid=='m1478733396288081920177259911521' else 'CHANGED!'})")
    print(f"channels live={len(live_ids)} saved={len(saved_ids)}")
    new_ch = live_ids - saved_ids
    gone_ch = saved_ids - live_ids
    if new_ch:
        print("  NEW channels:", ", ".join(sorted(new_ch)))
    if gone_ch:
        print("  REMOVED channels (in saved, not live):", ", ".join(sorted(gone_ch)))

    changed = []
    all_live_assets = set()
    name_by_id = {c["ID"]: c.get("CHANNEL_NAME") for c in channels}
    for i, ch in enumerate(channels, 1):
        cid = ch["ID"]
        name = ch.get("CHANNEL_NAME")
        try:
            arts = unjsonp(post("/api/newsAll.action", {"channelId": cid, "jsoncallback": "cb"}))
        except Exception as e:
            print(f"  [{i}] {name} FETCH-FAIL {e}")
            continue
        all_live_assets |= assets_of(arts)
        saved_p = CHAN_DIR / f"{cid}.json"
        if not saved_p.exists():
            changed.append((name, cid, "NEW-CHANNEL", len(arts) if isinstance(arts, list) else 0))
            time.sleep(0.1)
            continue
        saved = json.loads(saved_p.read_text())
        live_sigs = [art_sig(a) for a in arts] if isinstance(arts, list) else []
        saved_sigs = [art_sig(a) for a in saved] if isinstance(saved, list) else []
        if live_sigs != saved_sigs:
            changed.append((name, cid, f"{len(saved_sigs)}->{len(live_sigs)} arts / sig-diff", len(live_sigs)))
        time.sleep(0.1)

    print(f"\n=== CONTENT CHANGES: {len(changed)} channel(s) differ ===")
    for name, cid, what, n in changed:
        print(f"  * {name}  [{cid}]  {what}")

    # asset diff
    saved_assets = set()
    for p in CHAN_DIR.glob("*.json"):
        try:
            saved_assets |= assets_of(json.loads(p.read_text()))
        except Exception:
            pass
    new_assets = all_live_assets - saved_assets
    gone_assets = saved_assets - all_live_assets
    print(f"\n=== ASSET CHANGES ===  live={len(all_live_assets)} saved={len(saved_assets)}")
    for u in sorted(new_assets):
        print("  + NEW ASSET:", u)
    for u in sorted(gone_assets):
        print("  - GONE ASSET:", u)
    if not new_assets and not gone_assets:
        print("  (no asset URL changes)")


if __name__ == "__main__":
    main()
