#!/usr/bin/env python3
"""Archive official HTML and image fingerprints without changing curated input."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import difflib
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import urllib.error
import urllib.parse
import urllib.request

from bs4 import BeautifulSoup

HERE = Path(__file__).resolve().parent
BASE = "https://chinasoft.ccf.org.cn/2026/"
PORTRAITS = ".speaker-member img, .committee-member img, .speaker-card img, .committee-item img"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def now():
    return datetime.now(timezone.utc).isoformat()


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def links(html):
    """Follow active in-site routing handlers, excluding commented-out material."""
    result = set()
    for node in BeautifulSoup(html, "html.parser").select("[onclick]"):
        action = node["onclick"]
        page = re.fullmatch(r"loadPage\('([^']+)'\)", action)
        intro = re.fullmatch(r"loadIntroPage\('([^']+)'\)", action)
        forum = re.fullmatch(r"loadAgenda\('([^']+)',\s*'([^']+)'\)", action)
        if page:
            result.add(f"pages/{page[1]}.html")
        elif intro:
            result.add(f"pages/intro/{intro[1]}.html")
        elif forum:
            result.add(f"pages/agenda/{forum[1]}/templates/{forum[2]}.html")
    for path in result:
        if ".." in Path(path).parts or not re.fullmatch(r"[\w/.-]+\.html", path):
            raise ValueError(f"Unexpected routing path: {path}")
    return result


def request_once(url, expected_type, allow_missing=False):
    req = urllib.request.Request(urllib.parse.quote(url, safe=":/%?=&"),
                                 headers={"User-Agent": "fora/chinasoft2026-update-check"})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read()
            content_type = response.headers.get_content_type()
            if not content_type.startswith(expected_type):
                raise ValueError(f"Unexpected content type {content_type}: {url}")
            return body, {
                "url": url, "final_url": response.url, "status": response.status,
                "checked_at": now(), "sha256": digest(body), "bytes": len(body),
                "content_type": content_type, "etag": response.headers.get("ETag"),
                "last_modified": response.headers.get("Last-Modified"),
            }
    except urllib.error.HTTPError as error:
        if allow_missing and error.code in {404, 410}:
            return b"", {"url": url, "status": error.code, "checked_at": now()}
        raise


def request(url, expected_type, allow_missing=False):
    for attempt in range(1, 4):
        try:
            body, metadata = request_once(url, expected_type, allow_missing)
            metadata["attempts"] = attempt
            return body, metadata
        except urllib.error.HTTPError:
            raise
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt == 3:
                raise
            print(f"Transport error on {url}: {error}; retry {attempt}/2", file=sys.stderr, flush=True)


def compare(old, new):
    def fingerprint(entry):
        return entry.get("status", 200), entry.get("sha256")
    return {
        "added": sorted(new.keys() - old.keys()),
        "removed": sorted(old.keys() - new.keys()),
        "changed": sorted(key for key in old.keys() & new.keys()
                          if fingerprint(old[key]) != fingerprint(new[key])),
        "unchanged_count": sum(fingerprint(old[key]) == fingerprint(new[key])
                               for key in old.keys() & new.keys()),
    }


def archive(path, pages):
    with tarfile.open(path, "w:gz") as output:
        for name, body in sorted(pages.items()):
            entry = tarfile.TarInfo(name)
            entry.size = len(body)
            output.addfile(entry, io.BytesIO(body))


def read_archive(directory, manifest):
    path = directory / "html.tar.gz"
    if digest(path.read_bytes()) != manifest["archive_sha256"]:
        raise ValueError(f"Snapshot archive hash mismatch: {path}")
    with tarfile.open(path) as source:
        return {entry.name: source.extractfile(entry).read() for entry in source if entry.isfile()}


def previous_snapshot(root):
    complete = []
    for path in root.glob("*/manifest.json"):
        manifest = json.loads(path.read_text())
        if manifest.get("status") == "complete":
            complete.append((manifest["started_at"], path.parent, manifest))
    return max(complete, key=lambda entry: entry[0]) if complete else None


def write_diff(path, old, new):
    chunks = []
    for name in sorted(old.keys() | new.keys()):
        chunks.extend(difflib.unified_diff(
            old.get(name, b"").decode("utf-8").splitlines(keepends=True),
            new.get(name, b"").decode("utf-8").splitlines(keepends=True),
            fromfile=f"before/{name}", tofile=f"after/{name}"))
    path.write_text("".join(chunks), encoding="utf-8")


def check(root):
    started = now()
    previous = previous_snapshot(root)
    directory = root / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    directory.mkdir(parents=True, exist_ok=False)
    manifest = {"format": 1, "status": "running", "started_at": started,
                "base_url": BASE, "pages": {}, "portraits": {}, "withdrawn_pages": {}}
    try:
        curated = {p.relative_to(HERE / "raw").as_posix(): p.read_bytes()
                   for p in (HERE / "raw").rglob("*.html")}
        imported = {"pages": {p: {"sha256": digest(body)} for p, body in curated.items()},
                    "portraits": {url: {"sha256": entry["source_sha256"]} for url, entry in
                                  json.loads((HERE / "raw/portraits.json").read_text()).items()}}
        manifest["curated_git_revision"] = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=HERE, text=True).strip()
        # Save the exact local baseline too; it may contain deliberate data edits.
        archive(directory / "curated-html.tar.gz", curated)
        manifest["curated_archive_sha256"] = digest((directory / "curated-html.tar.gz").read_bytes())
        dump(directory / "curated-manifest.json", imported)
        if previous:
            _, previous_dir, baseline = previous
            previous_pages = read_archive(previous_dir, baseline)
            previous_pages = {p: previous_pages[p] for p in baseline["pages"]}
            manifest["baseline"] = previous_dir.name
        else:
            baseline, previous_pages = imported, curated
            manifest["baseline"] = "curated-input (not an unmodified official snapshot)"
        bodies = {}
        pending = {"index.html", "pages/home.html", "pages/introduction.html"}
        while pending:
            path = min(pending)
            pending.remove(path)
            if path in manifest["pages"]:
                continue
            body, metadata = request(BASE + path, "text/html", allow_missing=True)
            manifest["pages"][path] = metadata
            if metadata["status"] != 200:
                print(f"Missing active page: HTTP {metadata['status']} {BASE + path}",
                      file=sys.stderr, flush=True)
                continue
            body.decode("utf-8")
            bodies[path] = body
            pending.update(links(body) - manifest["pages"].keys())
        print(f"Fetched {len(bodies)} active HTML pages", flush=True)
        watched = (baseline["pages"].keys() | baseline.get("withdrawn_pages", {}).keys()
                   | imported["pages"].keys()) - manifest["pages"].keys()
        withdrawn_bodies = {}
        for path in sorted(watched):
            body, metadata = request(BASE + path, "text/html", allow_missing=True)
            manifest["withdrawn_pages"][path] = metadata
            if metadata["status"] == 200:
                withdrawn_bodies[f"withdrawn/{path}"] = body
        archive(directory / "html.tar.gz", bodies | withdrawn_bodies)
        manifest["archive_sha256"] = digest((directory / "html.tar.gz").read_bytes())
        urls = set()
        for body in bodies.values():
            for node in BeautifulSoup(body, "html.parser").select(PORTRAITS):
                urls.add(urllib.parse.urljoin(BASE, node["src"]))
        if not urls:
            raise ValueError("No portrait references found")
        def image_hash(url):
            # A confirmed broken reference is source data, not a network fallback.
            # Timeouts, server errors and unexpected content types still fail the run.
            _, metadata = request(url, "image/", allow_missing=True)
            return url, metadata
        with ThreadPoolExecutor(max_workers=6) as pool:
            for url, metadata in pool.map(image_hash, sorted(urls)):
                manifest["portraits"][url] = metadata
        print(f"Checked {len(urls)} active portrait URLs", flush=True)
        report = {"baseline": manifest["baseline"], "since_previous_check": {},
                  "versus_curated_input": {}, "withdrawn_pages": manifest["withdrawn_pages"],
                  "broken_pages": {path: entry for path, entry in manifest["pages"].items()
                                   if entry["status"] != 200},
                  "broken_portraits": {url: entry for url, entry in manifest["portraits"].items()
                                       if entry["status"] != 200}}
        old_withdrawn = baseline["pages"] | baseline.get("withdrawn_pages", {})
        report["withdrawn_page_changes"] = compare(
            {p: old_withdrawn[p] for p in watched if p in old_withdrawn},
            manifest["withdrawn_pages"])
        for kind in ("pages", "portraits"):
            report["since_previous_check"][kind] = compare(baseline[kind], manifest[kind])
            report["versus_curated_input"][kind] = compare(imported[kind], manifest[kind])
        report["coverage_note"] = (
            "The checker includes callforpaper/history; the curated importer excludes them. "
            "Their first appearance establishes coverage, not evidence of recent publication. "
            "HTML is archived verbatim; portraits have content hashes, not archived originals. "
            "CSS, JavaScript, other images, attachments and external sites are outside this check. "
            "A withdrawn navigation link is not evidence of cancellation. "
            "R32 curated role-paragraph removals are documented in CHINASOFT2026_GAPS.md.")
        # A failed response has no source body; never present it as deleted content.
        missing = report["broken_pages"]
        write_diff(directory / "since-previous.patch",
                   {p: body for p, body in previous_pages.items() if p not in missing}, bodies)
        write_diff(directory / "versus-curated.patch",
                   {p: body for p, body in curated.items() if p not in missing}, bodies)
        dump(directory / "report.json", report)
        if missing:
            raise ValueError(f"Incomplete source check: {len(missing)} active HTML pages unavailable; "
                             f"accessible pages and portrait results saved in {directory}")
        manifest.update(status="complete", completed_at=now())
        dump(directory / "manifest.json", manifest)
        print(directory)
        print(json.dumps({kind: {key: len(value) if isinstance(value, list) else value
                                for key, value in changes.items()}
                          for kind, changes in report["since_previous_check"].items()}))
        return directory
    except Exception as error:
        manifest.update(status="failed", completed_at=now(), error=str(error),
                        error_url=getattr(error, "url", None))
        dump(directory / "manifest.json", manifest)
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=HERE / "checks")
    check(parser.parse_args().output)
