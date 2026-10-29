#!/usr/bin/env bash
# Run from cron with the same Codex login as the interactive maintainer.
set -euo pipefail
umask 077

repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)"
run_mode="${1:-}"
case "$run_mode" in
  ""|--scheduled|--smoke-test) ;;
  *) printf 'Unsupported argument\n' >&2; exit 2 ;;
esac
if [[ "$run_mode" == "--scheduled" ]]; then
  today="$(TZ=Asia/Shanghai date +%F)"
  # This conference's active maintenance window; manual checks remain available.
  if [[ "$today" < "2026-10-29" || "$today" > "2026-11-08" ]]; then
    exit 0
  fi
fi
run_root="$repo_dir/.automation/chinasoft2026"
mkdir -p "$run_root/runs"
exec 9>"$run_root/run.lock"
if ! flock -n 9; then
  printf '%s Another ChinaSoft refresh is still running.\n' "$(date -Is)" >> "$run_root/scheduler.log"
  exit 0
fi
run_id="$(date -u +%Y%m%dT%H%M%SZ)"
run_dir="$run_root/runs/$run_id"
mkdir "$run_dir"
exec >>"$run_dir/execution.log" 2>&1
on_exit() {
  result=$?
  if [[ $result != 0 ]]; then
    printf 'failed\n' > "$run_dir/status.txt"
    if [[ ! -s "$run_dir/report.txt" ]]; then
      printf '定时检查未完成（退出码 %s）。详情：%s/execution.log\n' "$result" "$run_dir" > "$run_dir/report.txt"
    fi
    if [[ "$run_mode" != "--smoke-test" ]]; then
      ln -sfn "runs/$run_id/report.txt" "$run_root/latest-report.txt"
    fi
  fi
}
trap on_exit EXIT
printf '%s Starting ChinaSoft refresh.\n' "$(date -Is)"

for dependency in git gh codex uv pnpm; do
  command -v "$dependency" >/dev/null
done
test -s "$HOME/.ghtoken"
export GH_TOKEN="$(cat "$HOME/.ghtoken")"
gh api user --jq .login > "$run_dir/github-account.txt"

if [[ "${1:-}" == "--smoke-test" ]]; then
  codex exec --approve-for-me --ephemeral -C "$repo_dir" --color never \
    -o "$run_dir/report.txt" "This is an authorized scheduler connectivity smoke test. Do not use tools or modify files. Reply exactly: scheduler connectivity verified"
  grep -qx 'scheduler connectivity verified' "$run_dir/report.txt"
  printf 'verified\n' > "$run_dir/status.txt"
  exit 0
fi
# Curated inputs stay in one local checkout; only application code advances.
export FORA_PUBLISH_TOKEN="$(python3 - <<'TOKEN'
import json
from pathlib import Path
print(json.loads(Path('/root/.config/fora/worker-secrets.json').read_text())['PUBLISH_TOKEN'])
TOKEN
)"
pr_branch="main"
git -C "$repo_dir" fetch origin "$pr_branch"
base_revision="$(git -C "$repo_dir" rev-parse FETCH_HEAD)"
printf '%s\n' "$pr_branch" > "$run_dir/base-branch.txt"
printf '%s\n' "$base_revision" > "$run_dir/base-revision.txt"
worktree="$run_root/worktree"
if [[ ! -e "$worktree/.git" ]]; then
  git -C "$repo_dir" worktree add -b maintenance/chinasoft2026 "$worktree" "$base_revision"
else
  git -C "$worktree" merge --ff-only "$base_revision"
fi
export FORA_CHECK_DIR="$run_root/checks"
task_file="$run_dir/task.md"
git -C "$repo_dir" show "$base_revision:source/chinasoft2026/automation/TASK.md" > "$task_file"
printf '\nRuntime context: base branch `%s`, initial revision `%s`, run directory `%s`.\n' \
  "$pr_branch" "$base_revision" "$run_dir" >> "$task_file"

set +e
codex exec --approve-for-me -C "$worktree" --color never \
  -o "$run_dir/report.txt" - < "$task_file"
result=$?
set -e
printf '%s\n' "$result" > "$run_dir/exit-code.txt"
if [[ $result != 0 ]]; then
  printf 'failed\n' > "$run_dir/status.txt"
  printf '%s Codex failed with exit code %s; inspect %s.\n' "$(date -Is)" "$result" "$run_dir" >> "$run_root/scheduler.log"
  exit "$result"
fi
test -s "$run_dir/report.txt"
printf 'finished; inspect report for publication outcome\n' > "$run_dir/status.txt"
ln -sfn "runs/$run_id/report.txt" "$run_root/latest-report.txt"
printf '%s Finished; report: %s\n' "$(date -Is)" "$run_dir/report.txt" >> "$run_root/scheduler.log"
