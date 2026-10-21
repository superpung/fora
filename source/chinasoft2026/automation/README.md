# Daily ChinaSoft maintenance

The user requested daily execution at **18:00 Asia/Shanghai**, and confirmed
that this host stays online with its Codex login and `~/.ghtoken` available.
The installed host job is `/etc/cron.d/fora-chinasoft2026`; it invokes `run.sh`.
The host clock is UTC+08:00. Cron runs in Asia/Shanghai; the corresponding UTC
time is 10:00. The first scheduled run after installation is October 22, 2026.

This is a local host job, not a ChatGPT Scheduled task or GitHub Actions job.
Cron and the host must remain running. The current container has no systemd
init: after restarting the container, start `/usr/sbin/cron` again and verify
the job. No machine restart is performed by this workflow.

The job runs the installed Codex CLI with `--approve-for-me`, using the existing
`/root/.codex-2` configuration/authentication. It does not disable sandboxing or
approval review. The token is read at runtime, never stored in the repository.
The cron command sources `/etc/fora/chinasoft2026.env` (mode 0600) for this
host's credential-free HTTP proxy endpoints. They were checked to contain no
username, password, query, fragment or nonempty path. A clean-environment smoke
test is required: cron does not inherit the interactive shell's network settings.
Missing credentials, inaccessible source pages, unresolved choices and failed
checks must be reported rather than silently treated as a successful refresh.

Each run acquires a lock, records the active PR/head, fetches that base, and
creates a unique branch and worktree under `.automation/chinasoft2026/`.
The interactive checkout is never edited by the daily agent. An open ChinaSoft
PR is updated; if none remains open, the agent starts from main and creates a
new update PR. No merge, release, force-push, email or Slack action is authorized.
The complete task contract is [TASK.md](TASK.md).

Reports and logs are local and ignored by Git:

- `.automation/chinasoft2026/latest-report.txt`: latest Chinese final report.
- `.automation/chinasoft2026/runs/<UTC timestamp>/report.txt`: per-run report.
- `execution.log`, `status.txt`, `exit-code.txt`: execution details. A zero
  process exit does not prove an import succeeded; read the final report.
- The open PR's latest-check section records the result and validation on GitHub.

Run manually with `bash source/chinasoft2026/automation/run.sh`. Use
`--smoke-test` to verify GitHub authentication and a no-tool Codex response
without checking sources or changing the repository. The same lock prevents
overlapping daily jobs. Retain failed worktrees/logs for diagnosis; no automatic
destructive cleanup is performed.

To pause, remove or comment the job line in `/etc/cron.d/fora-chinasoft2026`.
To change its time, edit that file and this documented schedule together.
The runner and task are read from this checkout; keep these files available
when switching branches. Changes to the runner need a syntax/smoke check.
