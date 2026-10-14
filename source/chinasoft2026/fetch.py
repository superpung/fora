#!/usr/bin/env python3
"""Snapshot the published ChinaSoft 2026 pages; fail on any failed request.

Follow live DOM links only: commented-out links include previous-year material.
Download the complete snapshot before replacing any committed source files.
"""
import pathlib
import re
import urllib.request

from bs4 import BeautifulSoup

BASE = "https://chinasoft.ccf.org.cn/2026/"
RAW = pathlib.Path(__file__).resolve().parent / "raw"


def fetch():
    pages = {}

    def get(path):
        if path not in pages:
            request = urllib.request.Request(
                BASE + path, headers={"User-Agent": "fora/chinasoft2026"}
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                pages[path] = response.read().decode("utf-8")
            print(path)
        return BeautifulSoup(pages[path], "html.parser")

    index = get("index.html")
    paths = {"pages/home.html", "pages/introduction.html"}
    for link in index.select("[onclick]"):
        match = re.fullmatch(r"loadPage\('([^']+)'\)", link["onclick"])
        if match and match[1] not in {"history", "callforpaper"}:
            paths.add(f"pages/{match[1]}.html")
    for path in sorted(paths):
        soup = get(path)
        for link in soup.select("[onclick]"):
            action = link["onclick"]
            forum = re.fullmatch(r"loadAgenda\('([^']+)',\s*'([^']+)'\)", action)
            intro = re.fullmatch(r"loadIntroPage\('([^']+)'\)", action)
            if forum:
                get(f"pages/agenda/{forum[1]}/templates/{forum[2]}.html")
            elif intro:
                get(f"pages/intro/{intro[1]}.html")
    for path, html in pages.items():
        target = RAW / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding="utf-8")
    for old in RAW.rglob("*.html"):
        if old.relative_to(RAW).as_posix() not in pages:
            old.unlink()
    print(f"Saved {len(pages)} pages")


if __name__ == "__main__":
    fetch()
