# Local ChinaSoft maintenance

A single host job runs at **18:00 Asia/Shanghai**, from **October 29 through
November 8, 2026**, inclusive. The `--scheduled` date guard stops source checks
outside that window. Manual invocation remains available at any date. The user
confirmed that the host stays online with its Codex login and `~/.ghtoken`.
There is no Cloudflare Cron Trigger or GitHub source-check workflow.

`/etc/cron.d/fora-chinasoft2026` invokes `run.sh --scheduled`. The host clock is
UTC+08:00. The command sources `/etc/fora/chinasoft2026.env` (mode 0600) for its
credential-free proxy endpoints. Keep the existing Codex configuration at
`/root/.codex-2`; no model credentials are sent to a cloud workflow.

The runner takes a lock and uses one persistent checkout at
`.automation/chinasoft2026/worktree`, on `maintenance/chinasoft2026`. Code
fast-forwards from main; curated inputs remain local and may be uncommitted.
A conflicting code update stops for review rather than resetting those inputs.
The interactive checkout is never edited. Do not delete this maintenance
checkout as if it were a disposable run directory: it contains the working data.

The checker saves changed source snapshots under
`.automation/chinasoft2026/checks/`. Unchanged successful checks reuse the last
complete snapshot and append only a small record to `history.jsonl`.
`latest.json` points to the evidence; `latest-report.json` retains current
comparisons against curated input, including pending imports. Failed evidence
is preserved without advancing the complete baseline. Existing snapshots copied
from the former cloud store are local historical evidence, not a second backend.
Back up this local directory as ordinary working files.

The task reviews source differences, updates local inputs, validates a preview
and publishes through Fora's existing API. Neither raw input restoration from
R2 nor a data PR is required. General code changes still require a PR; the
scheduled curator never merges or releases code. See [TASK.md](TASK.md).

Reports remain local and ignored by Git:

- `runs/<UTC timestamp>/report.txt`: each run's Chinese report.
- `runs/<UTC timestamp>/execution.log`: commands and diagnostics.
- `latest-report.txt`: link to the latest maintenance report.

Run `bash source/chinasoft2026/automation/run.sh` for a manual check and curation.
Use `--smoke-test` to verify GitHub authentication and a no-tool Codex response
without changing data. Verify the runner in a clean cron environment after edits.
To pause scheduled work, comment its line in `/etc/cron.d/fora-chinasoft2026`.
Application hosting, D1 sync and published R2 data are independent of this job.
