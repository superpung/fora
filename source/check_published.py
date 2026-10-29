#!/usr/bin/env python3
"""Check official sources using the published inputs and private observation history."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import tarfile

from chinasoft2026.check_updates import check, previous_snapshot
from publish_data import ROOT, OUTPUT, request, restore_sources, upload


def restore_check(base, token, key, target):
    blob = request(base, 'archives/' + key, token)[0]
    if hashlib.sha256(blob).hexdigest() != Path(key).name.removesuffix('.tar.gz'):
        raise ValueError('Check snapshot checksum mismatch')
    with tarfile.open(fileobj=io.BytesIO(blob)) as archive:
        for member in archive.getmembers():
            path = Path(member.name)
            if (not member.isfile() or path.is_absolute() or '..' in path.parts or len(path.parts) != 2
                    or not path.parts[0].endswith('Z')
                    or path.name not in {'manifest.json', 'report.json', 'html.tar.gz', 'curated-html.tar.gz',
                                         'curated-manifest.json', 'since-previous.patch', 'versus-curated.patch'}):
                raise ValueError('Unexpected check archive entry')
        archive.extractall(target, filter='data')


def prepare(base, token):
    restore_sources(base, token)
    current = json.loads(request(base, 'checks', token)[0])
    root = OUTPUT / 'checks'
    root.mkdir(parents=True, exist_ok=True)
    index = current['index'] or {}
    for key in set(filter(None, [index.get('successful'), index.get('latest')])):
        restore_check(base, token, key, root)
    if not index.get('successful'):
        # Seed the original successful observation, never an incomplete run.
        previous = previous_snapshot(ROOT / 'source/chinasoft2026/checks')
        if previous:
            shutil.copytree(previous[1], root / previous[1].name, dirs_exist_ok=True)
    return root, current


def run(base, token):
    root, current = prepare(base, token)
    before = set(root.iterdir())
    error = None
    try:
        directory = check(root)
    except Exception as caught:
        error = caught
        created = set(root.iterdir()) - before
        if len(created) != 1:
            raise
        directory = created.pop()
    manifest = json.loads((directory / 'manifest.json').read_text())
    complete = manifest['status'] == 'complete'
    target = OUTPUT / 'check.tar.gz'
    with tarfile.open(target, 'w:gz') as archive:
        for path in sorted(directory.iterdir()):
            if path.is_file():
                archive.add(path, arcname=directory.name + '/' + path.name, recursive=False)
    key = 'checks/' + hashlib.sha256(target.read_bytes()).hexdigest() + '.tar.gz'
    upload(base, token, 'archives', key, target)
    body = json.dumps({'snapshot': key, 'complete': complete, 'expected_etag': current['etag']}).encode()
    request(base, 'checks', token, 'POST', body)
    lines = [f"检查时间：{manifest['started_at']}", '检查状态：' + ('完整' if complete else '不完整')]
    report_path = directory / 'report.json'
    if report_path.exists():
        report = json.loads(report_path.read_text())
        for group, label in [('since_previous_check', '相对上次完整检查'), ('versus_curated_input', '相对已收录内容')]:
            changes = report.get(group, {})
            for kind, name in [('pages', 'HTML'), ('portraits', '照片')]:
                delta = changes.get(kind, {})
                lines.append(f"{label} {name}：新增 {len(delta.get('added', []))}、变化 {len(delta.get('changed', []))}、移除引用 {len(delta.get('removed', []))}")
            for path in changes.get('pages', {}).get('added', []) + changes.get('pages', {}).get('changed', []):
                lines.append('- ' + path)
        for path in report.get('broken_pages', {}):
            lines.append('来源不可访问（保留已收录内容）：' + path)
    if error:
        lines.append('错误：' + str(error))
    lines.append('检查结果已存档；内容更新需审阅后独立发布。')
    summary = '\n'.join(lines) + '\n'
    (OUTPUT / 'check-report.txt').write_text(summary)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as file:
            file.write(summary)
    print(summary)
    return 0 if complete else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='https://fora.repus.me')
    parser.add_argument('--restore-only', action='store_true')
    args = parser.parse_args()
    token = os.environ['FORA_PUBLISH_TOKEN']
    if args.restore_only:
        prepare(args.base, token)
    else:
        raise SystemExit(run(args.base, token))
