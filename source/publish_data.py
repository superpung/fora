#!/usr/bin/env python3
"""Stage or promote a validated data release independently of application code."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / ".data-release"


def request(base, path, token, method="GET", body=None, content_type="application/json", digest=None):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": content_type}
    if digest:
        headers["X-Content-SHA256"] = digest
    req = urllib.request.Request(base.rstrip("/") + "/api/publish/" + path,
                                 data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            return response.read(), response.headers
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:400]
        raise RuntimeError(f"Publisher {method} {path}: HTTP {error.code}: {detail}") from None


def upload(base, token, kind, key, path):
    body = path.read_bytes()
    digest = hashlib.sha256(body).hexdigest()
    content_type = "application/json" if path.suffix == ".json" else "image/webp" if path.suffix == ".webp" else "application/gzip"
    request(base, f"{kind}/{key}", token, "PUT", body, content_type, digest)
    return digest


def source_files():
    """Archive curated inputs, never executable code or unbounded check history."""
    for path in (ROOT / "source").rglob("*"):
        if not path.is_file() or any(part in {"checks", "automation", "__pycache__", "images", "files", "tiles"} for part in path.parts):
            continue
        if path.suffix in {".json", ".html", ".txt"}:
            yield path
    yield from (ROOT / "data/forums_detail").glob("*.json")
    yield from (ROOT / "web/public/portraits").rglob("*.webp")
    yield ROOT / "data/CHINASOFT2026_GAPS.md"


def archive_sources():
    OUTPUT.mkdir(exist_ok=True)
    target = OUTPUT / "source.tar.gz"
    with tarfile.open(target, "w:gz") as archive:
        for path in sorted(set(source_files())):
            archive.add(path, arcname=path.relative_to(ROOT), recursive=False)
    return target


def restore_sources(base, token):
    current = json.loads(request(base, "catalog", token)[0])
    if not current["catalog"]:
        raise ValueError("No published source archive")
    key = current["catalog"]["source_archive"]
    blob = request(base, "archives/" + key, token)[0]
    if hashlib.sha256(blob).hexdigest() != Path(key).name.removesuffix(".tar.gz"):
        raise ValueError("Source archive checksum mismatch")
    OUTPUT.mkdir(exist_ok=True)
    target = OUTPUT / "restored-source.tar.gz"
    target.write_bytes(blob)
    extract_sources(target)
    print("Restored the published curated inputs; code was not restored")


def extract_sources(target):
    """Validate the whole archive before replacing the curated input file set."""
    with tarfile.open(target) as archive:
        restored = set()
        for member in archive.getmembers():
            path = Path(member.name)
            allowed = (member.name.startswith("source/") and path.suffix in {".json", ".html", ".txt"}) or \
                (member.name.startswith("data/forums_detail/") and path.suffix == ".json") or \
                (member.name.startswith("web/public/portraits/") and path.suffix == ".webp") or \
                member.name == "data/CHINASOFT2026_GAPS.md"
            if not allowed or not member.isfile() or path.is_absolute() or ".." in path.parts:
                raise ValueError(f"Unexpected source archive member: {member.name}")
            if (ROOT / path).resolve() != ROOT / path or path in restored:
                raise ValueError(f"Unsafe or duplicate source archive member: {member.name}")
            restored.add(path)
        if not restored:
            raise ValueError("Empty source archive")
        archive.extractall(ROOT, filter="data")
        for path in set(source_files()):
            if path.is_file() and path.relative_to(ROOT) not in restored:
                path.unlink()


def stage(base, token, summary):
    inputs = {path.relative_to(ROOT).as_posix() for path in source_files()}
    changed = subprocess.check_output(["git", "diff", "HEAD", "--name-only", "-z"], cwd=ROOT).decode().split("\0")
    changed += subprocess.check_output(["git", "ls-files", "--others", "--exclude-standard", "-z"], cwd=ROOT).decode().split("\0")
    code = [path for path in changed if path and path not in inputs and not
            (path.startswith("data/") and path.endswith(".json")) and not path.startswith("web/src/data/")]
    if code:
        raise ValueError("Commit application/parser changes before staging: " + ", ".join(code))
    for script in ["source/build_all.py", "source/validate.py"]:
        subprocess.run([sys.executable, script], cwd=ROOT, check=True)
    subprocess.run(["node", "web/scripts/prepare-data.mjs"], cwd=ROOT, check=True,
                   env={**os.environ, "DATA_OUTPUT_DIR": str(OUTPUT / "public")})
    previous = json.loads(request(base, "catalog", token)[0])
    catalog = json.loads((OUTPUT / "public/manifest.json").read_text())
    now = datetime.now(timezone.utc).isoformat()
    old = {entry["id"]: entry for entry in (previous["catalog"] or {}).get("conferences", [])}
    for entry in catalog["conferences"]:
        before = old.get(entry["id"], {})
        entry["updated_at"] = before["updated_at"] if before.get("sha256") == entry["sha256"] else now[:10]
    archive = archive_sources()
    archive_key = "sources/" + hashlib.sha256(archive.read_bytes()).hexdigest() + ".tar.gz"
    upload(base, token, "archives", archive_key, archive)
    objects = []
    for entry in catalog["conferences"]:
        objects.append((entry["path"], OUTPUT / "public" / entry["path"]))
    objects.extend((p.relative_to(OUTPUT / "public").as_posix(), p) for p in (OUTPUT / "public/portraits").rglob("*.webp"))
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(lambda item: upload(base, token, "objects", *item), objects))
    catalog.update(released_at=now, source_archive=archive_key,
                   code_revision=subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
                   summary=summary)
    payload = json.dumps(catalog, ensure_ascii=False, sort_keys=True).encode()
    digest = hashlib.sha256(payload).hexdigest()
    path = OUTPUT / f"{digest}.json"
    path.write_bytes(payload)
    upload(base, token, "objects", f"releases/{digest}.json", path)
    staged = {"manifest_hash": digest, "expected_etag": previous["etag"],
              "preview_url": base.rstrip("/") + "/?dataVersion=" + digest, "summary": summary}
    (OUTPUT / "staged.json").write_text(json.dumps(staged, indent=2) + "\n")
    print(json.dumps(staged, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["stage", "promote", "restore"])
    parser.add_argument("--base", required=True)
    parser.add_argument("--summary", default="")
    args = parser.parse_args()
    token = os.environ.get("FORA_PUBLISH_TOKEN")
    if not token:
        raise ValueError("FORA_PUBLISH_TOKEN is required")
    if args.command == "restore":
        restore_sources(args.base, token)
    elif args.command == "stage":
        if not args.summary:
            raise ValueError("A concrete release summary is required")
        stage(args.base, token, args.summary)
    else:
        staged = json.loads((OUTPUT / "staged.json").read_text())
        body = json.dumps({k: staged[k] for k in ["manifest_hash", "expected_etag"]}).encode()
        print(request(args.base, "promote", token, "POST", body)[0].decode())


if __name__ == "__main__":
    main()
