#!/usr/bin/env bash
# Run from cron with the same Codex login as the interactive maintainer.
set -euo pipefail
umask 077

repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../.." && pwd)"
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
run_mode="${1:-}"
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
if [[ $# != 0 ]]; then
  printf 'Unsupported argument\n' >&2
  exit 2
fi

# Inspect the PR before choosing a base. Each run owns its branch and worktree.
gh api repos/superpung/fora/pulls?state=open\&per_page=100 > "$run_dir/open-prs.json"
pr_branch="$(uv run --project "$repo_dir" python - "$run_dir/open-prs.json" <<'PY'
import json, sys
prs = [p for p in json.load(open(sys.argv[1]))
       if p['head']['repo']['full_name'] == 'superpung/fora'
       and 'chinasoft2026' in p['head']['ref']]
if len(prs) > 1:
    raise SystemExit('Multiple ChinaSoft PRs are open; report and resolve before choosing a branch.')
print(prs[0]['head']['ref'] if prs else 'main')
PY
)"
git -C "$repo_dir" fetch origin "$pr_branch"
base_revision="$(git -C "$repo_dir" rev-parse FETCH_HEAD)"
printf '%s\n' "$pr_branch" > "$run_dir/base-branch.txt"
printf '%s\n' "$base_revision" > "$run_dir/base-revision.txt"
worktree="$run_root/worktrees/$run_id"
git -C "$repo_dir" worktree add -b "automation/chinasoft2026-$run_id" "$worktree" "$base_revision"
task_file="$run_dir/task.md"
cat "$repo_dir/source/chinasoft2026/automation/TASK.md" > "$task_file"
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
printf 'finished; inspect report for import and PR outcome\n' > "$run_dir/status.txt"
ln -sfn "runs/$run_id/report.txt" "$run_root/latest-report.txt"
printf '%s Finished; report: %s\n' "$(date -Is)" "$run_dir/report.txt" >> "$run_root/scheduler.log"
