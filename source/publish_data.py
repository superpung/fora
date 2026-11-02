#!/usr/bin/env python3
"""Stage or promote a validated data release independently of application code."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import http.client
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = Path(os.environ["FORA_MAINTENANCE_ROOT"]).resolve() if os.environ.get("FORA_MAINTENANCE_ROOT") else Path(__file__).resolve().parent.parent
OUTPUT = ROOT / ".data-release"


def request(base, path, token, method="GET", body=None, content_type="application/json", digest=None):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": content_type,
               "User-Agent": "ForaPublisher/1.0"}
    if digest:
        headers["X-Content-SHA256"] = digest
    req = urllib.request.Request(base.rstrip("/") + "/api/publish/" + path,
                                 data=body, headers=headers, method=method)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as response:
                return response.read(), response.headers
        except urllib.error.HTTPError as error:
            if method not in {"GET", "HEAD", "PUT"} or error.code < 500 or attempt == 2:
                detail = error.read().decode("utf-8", errors="replace")[:400]
                raise RuntimeError(f"Publisher {method} {path}: HTTP {error.code}: {detail}") from None
            error.close()
        except (urllib.error.URLError, http.client.RemoteDisconnected, TimeoutError):
            if method not in {"GET", "HEAD", "PUT"} or attempt == 2:
                raise
        print(f"Retrying interrupted {method} {path} ({attempt + 2}/3)", flush=True)
        time.sleep(attempt + 1)


def upload(base, token, key, path):
    body = path.read_bytes()
    digest = hashlib.sha256(body).hexdigest()
    content_type = "application/json" if path.suffix == ".json" else "image/webp"
    request(base, f"objects/{key}", token, "PUT", body, content_type, digest)
    return digest


def stage(base, token, summary):
    if not os.environ.get("FORA_MAINTENANCE_ROOT"):
        raise ValueError("FORA_MAINTENANCE_ROOT must name the external maintenance workspace")
    code_root = Path(__file__).resolve().parent.parent
    changed = subprocess.check_output(
        ["git", "status", "--porcelain", "--untracked-files=all"], cwd=code_root, text=True)
    if changed.strip():
        raise ValueError("Commit code repository changes before staging: " + changed.strip())
    revision = subprocess.check_output(["git", "rev-parse", "HEAD"],
                                      cwd=code_root, text=True).strip()
    subprocess.run([sys.executable, str(Path(__file__).with_name("validate.py")),
                    str(ROOT / "data")], check=True)
    subprocess.run([sys.executable, "source/build_manifest.py"], cwd=ROOT, check=True)
    subprocess.run(["node", "web/scripts/prepare-data.mjs"], cwd=ROOT, check=True,
                   env={**os.environ, "DATA_OUTPUT_DIR": str(OUTPUT / "public")})
    previous = json.loads(request(base, "catalog", token)[0])
    catalog = json.loads((OUTPUT / "public/manifest.json").read_text())
    now = datetime.now(timezone.utc).isoformat()
    old = {entry["id"]: entry for entry in (previous["catalog"] or {}).get("conferences", [])}
    for entry in catalog["conferences"]:
        before = old.get(entry["id"], {})
        entry["updated_at"] = before["updated_at"] if before.get("sha256") == entry["sha256"] else now[:10]
    objects = []
    for entry in catalog["conferences"]:
        objects.append((entry["path"], OUTPUT / "public" / entry["path"]))
    objects.extend((p.relative_to(OUTPUT / "public").as_posix(), p) for p in (OUTPUT / "public/portraits").rglob("*.webp"))
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(upload, base, token, *item) for item in objects]
        for count, future in enumerate(as_completed(futures), 1):
            future.result()
            if count % 50 == 0 or count == len(objects):
                print(f"Uploaded {count}/{len(objects)} public objects", flush=True)
    catalog.update(released_at=now,
                   code_revision=revision,
                   summary=summary)
    payload = json.dumps(catalog, ensure_ascii=False, sort_keys=True).encode()
    digest = hashlib.sha256(payload).hexdigest()
    path = OUTPUT / f"{digest}.json"
    path.write_bytes(payload)
    upload(base, token, f"releases/{digest}.json", path)
    staged = {"manifest_hash": digest, "expected_etag": previous["etag"],
              "preview_url": base.rstrip("/") + "/?dataVersion=" + digest, "summary": summary}
    (OUTPUT / "staged.json").write_text(json.dumps(staged, indent=2) + "\n")
    print(json.dumps(staged, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["stage", "promote"])
    parser.add_argument("--base", required=True)
    parser.add_argument("--summary", default="")
    args = parser.parse_args()
    token = os.environ.get("FORA_PUBLISH_TOKEN")
    if not token:
        raise ValueError("FORA_PUBLISH_TOKEN is required")
    if args.command == "stage":
        if not args.summary:
            raise ValueError("A concrete release summary is required")
        stage(args.base, token, args.summary)
    else:
        staged = json.loads((OUTPUT / "staged.json").read_text())
        body = json.dumps({k: staged[k] for k in ["manifest_hash", "expected_etag"]}).encode()
        print(request(args.base, "promote", token, "POST", body)[0].decode())


if __name__ == "__main__":
    main()
