#!/usr/bin/env python3
"""ChinaSoft 2025 adapter, part 1 of 2: fetch.

Download every agenda template (and the category index pages + a few metadata
pages) from the static site into raw/, so the parser (build.py) can run
deterministically offline. The site is a static OSS bucket: pages are HTML
fragments loaded client-side; each forum's detail lives at
  pages/agenda/<category>/templates/<id>.html
and each category's index lists its (category, id) pairs via loadAgenda(...).
"""
import re, time, pathlib, urllib.request, urllib.error

BASE = "https://chinasoft.ccf.org.cn/2025"
RAW = pathlib.Path(__file__).resolve().parent / "raw"

# Agenda categories that use the loadAgenda(category, id) template mechanism.
CATEGORIES = [
    "keynote-speech",
    "academician-summit",
    "academic-forum",
    "regular-forum",
    "industry-forum",
    "education-forum",
    "special-issue-forum",
    "competition",
    "joint-events",
]
# Standalone metadata pages (plain fragments, no templates).
META_PAGES = ["introduction", "register", "contact"]

HEADERS = {"User-Agent": "Mozilla/5.0 conf-scheduler/chinasoft-adapter"}


def get(url: str) -> str | None:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        print(f"  ! {e.code} {url}")
        return None
    except Exception as e:  # noqa: BLE001
        print(f"  ! {e} {url}")
        return None


def save(rel: str, text: str):
    p = RAW / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def template_ids(index_html: str, category: str) -> list[str]:
    # onclick="loadAgenda('<category>', '<id>')"
    ids = re.findall(rf"loadAgenda\('{re.escape(category)}',\s*'([^']+)'\)", index_html)
    seen, out = set(), []
    for i in ids:
        if i not in seen:
            seen.add(i)
            out.append(i)
    return out


def main():
    total = 0
    summary = {}
    for cat in CATEGORIES:
        idx = get(f"{BASE}/pages/agenda/{cat}/index.html")
        if idx is None:
            summary[cat] = 0
            continue
        save(f"index/{cat}.html", idx)
        ids = template_ids(idx, cat)
        summary[cat] = len(ids)
        for tid in ids:
            html = get(f"{BASE}/pages/agenda/{cat}/templates/{tid}.html")
            if html is not None:
                save(f"templates/{cat}/{tid}.html", html)
                total += 1
            time.sleep(0.05)
        print(f"{cat}: {len(ids)} templates")
    for pg in META_PAGES:
        html = get(f"{BASE}/pages/{pg}.html")
        if html is None:
            continue
        save(f"meta/{pg}.html", html)
        # The intro page is itself a mini-SPA: its nav links to committee
        # sub-pages via loadIntroPage('committee-*'), which loads
        # `./pages/intro/<page>.html` (see js/intro-navigation.js). Follow every
        # one so the conference committees (steering / program / organizing / ...)
        # are captured, not just the landing prose.
        if pg == "introduction":
            for sub in sorted(set(re.findall(r"loadIntroPage\('([^']+)'\)", html))):
                sub_html = get(f"{BASE}/pages/intro/{sub}.html")
                if sub_html is not None:
                    save(f"meta/intro/{sub}.html", sub_html)
                time.sleep(0.05)
    print(f"\nTotal templates: {total}")
    print("Per category:", summary)


if __name__ == "__main__":
    main()
