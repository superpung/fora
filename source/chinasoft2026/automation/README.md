# Daily ChinaSoft maintenance

The cloud source check runs at **18:00 Asia/Shanghai**. The existing local curator
runs at **18:10 Asia/Shanghai** after the observation job. The user confirmed
that this host stays online with its Codex login and `~/.ghtoken` available.
The installed host job is `/etc/cron.d/fora-chinasoft2026`; it invokes `run.sh`.
The host clock is UTC+08:00. Cron runs in Asia/Shanghai; the corresponding UTC
curation time is 10:10. Cloud observation and application hosting do not depend
on this host; unattended AI curation still does.

This runner performs AI curation using the existing local Codex login. It is not
a server for the application. Cloudflare Cron dispatches the observation workflow
independently. Do not copy the local Codex login into GitHub Actions.

The job runs the installed Codex CLI with `--approve-for-me`, using the existing
`/root/.codex-2` configuration/authentication. It does not disable sandboxing or
approval review. The token is read at runtime, never stored in the repository.
The cron command sources `/etc/fora/chinasoft2026.env` (mode 0600) for this
host's credential-free HTTP proxy endpoints. They were checked to contain no
username, password, query, fragment or nonempty path. A clean-environment smoke
test is required: cron does not inherit the interactive shell's network settings.
Missing credentials, inaccessible source pages, unresolved choices and failed
checks must be reported rather than silently treated as a successful refresh.

Each run acquires a lock and creates a unique branch/worktree from main under
`.automation/chinasoft2026/`. It restores published inputs and source observations
from private R2, reviews changes and publishes validated data through the narrow
publisher API. The interactive checkout is never edited. General code changes
still require a PR; the curator never merges or releases code. The complete task
contract is [TASK.md](TASK.md).

Reports and logs are local and ignored by Git:

- `.automation/chinasoft2026/latest-report.txt`: latest Chinese final report.
- `.automation/chinasoft2026/runs/<UTC timestamp>/report.txt`: per-run report.
- `execution.log`, `status.txt`, `exit-code.txt`: execution details. A zero
  process exit does not prove an import succeeded; read the final report.
- GitHub Actions retains the cloud observation report and differences; private R2
  retains source archives, the latest attempt and the last complete baseline.

Run manually with `bash source/chinasoft2026/automation/run.sh`. Use
`--smoke-test` to verify GitHub authentication and a no-tool Codex response
without checking sources or changing the repository. The same lock prevents
overlapping daily jobs. Retain failed worktrees/logs for diagnosis; no automatic
destructive cleanup is performed.

To pause, remove or comment the job line in `/etc/cron.d/fora-chinasoft2026`.
To change its time, edit that file and this documented schedule together.
The runner and task are read from this checkout; keep these files available
when switching branches. Changes to the runner need a syntax/smoke check.
