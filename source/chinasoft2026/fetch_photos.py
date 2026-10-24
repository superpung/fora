#!/usr/bin/env python3
"""Download and prepare every explicitly linked person portrait in the snapshot.

Originals live in a temporary cache; the source URL/hash manifest and compact
WebP files are committed. Any unavailable or invalid image fails the refresh.
"""
import concurrent.futures
import hashlib
import json
import pathlib
import subprocess
import tempfile
import urllib.parse
import urllib.request

from bs4 import BeautifulSoup

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
BASE = "https://chinasoft.ccf.org.cn/2026/"


def fetch():
    urls = set()
    for page in (HERE / "raw").rglob("*.html"):
        soup = BeautifulSoup(page.read_text(encoding="utf-8"), "html.parser")
        for image in soup.select(".speaker-member img, .committee-member img, .speaker-card img, .committee-item img"):
            urls.add(urllib.parse.urljoin(BASE, image["src"]))
    if not urls:
        raise ValueError("No portrait references found")
    with tempfile.TemporaryDirectory(prefix="chinasoft2026-portraits-") as cache:
        def download(url):
            name = hashlib.sha256(url.encode()).hexdigest() + pathlib.Path(urllib.parse.urlsplit(url).path).suffix
            request = urllib.request.Request(urllib.parse.quote(url, safe=":/%"),
                                             headers={"User-Agent": "fora/chinasoft2026"})
            with urllib.request.urlopen(request, timeout=30) as response:
                if not response.headers.get_content_type().startswith("image/"):
                    raise ValueError(f"Not an image: {url}")
                data = response.read()
            (pathlib.Path(cache) / name).write_bytes(data)
            return url, {"file": name, "status": 200, "sha256": hashlib.sha256(data).hexdigest()}

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            manifest = dict(pool.map(download, sorted(urls)))
        (pathlib.Path(cache) / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        subprocess.run(["node", str(ROOT / "web/scripts/prepare-portraits.mjs"), cache], check=True)


if __name__ == "__main__":
    fetch()
