# Authorized daily ChinaSoft 2026 maintenance

The user authorized this job to run daily at 18:00 Asia/Shanghai on the
continuously online host, using their existing Codex login and `~/.ghtoken`.
Check https://chinasoft.ccf.org.cn/2026/, review actual source changes, update
the ChinaSoft PR, and return a brief Chinese report. Dependency installation,
commits, pushes and PR updates are authorized. Do not merge or release.

1. Read `AGENTS.md`, `data/CHINASOFT2026_GAPS.md`, the adapter README,
   `source/chinasoft2026/checks/README.md`, and the latest observation review.
   Work only in this run's isolated worktree and branch. Do not spawn agents,
   touch the interactive checkout, reset user changes, or force-push.
2. Use `~/.ghtoken` without printing it. Confirm the current open PR and its
   head via GitHub. If no ChinaSoft PR remains open, use current main and create
   a new ChinaSoft update PR after validation. If one remains open, push the
   validated commit to that PR's existing branch. If its remote head advances
   during this run, integrate and validate before an ordinary fast-forward push.
3. Run `uv run python source/chinasoft2026/check_updates.py`. Archive original
   HTML and portrait fingerprints. Review changes against both the last complete
   check and curated input. A failed check is never "no changes" and must not
   advance the success baseline. Report inaccessible URLs. Accessible evidence
   may be imported if reviewed, while preserving the incomplete-check status.
4. Apply published changes deterministically. Recheck every known source gap
   and data-only correction. Keep original source data distinct from curation;
   do not invent people, dates, times, rooms, abstracts, or identities. One-off
   source problems are corrected in data; modify reusable code only for a
   demonstrated general issue and add meaningful regression coverage. Ordinary
   typography, title prefixes and known distinct people need no warning flags.
   Preserve biographies without standalone role paragraphs as documented.
5. Refresh portraits when source references or bytes change. Review guarded
   enrichment when titles, indices or abstracts change; all AI content stays
   separate. Update the gap inventory and write an English observation review
   specifying actual additions, replacements, corrections, and remaining gaps.
6. For data/code changes, run the documented rebuild, schema/person validation,
   adapter tests, web lint/build and complete web/browser suite. Inspect relevant
   desktop/mobile screenshots, links, portraits, topics and live-clock behavior.
   Check both generated copies and deterministic rebuilding. Do not rebuild
   while browser tests are running. With no data/code changes, validate snapshot
   integrity and run checker tests; do not fabricate a data change.
7. Commit source/data/docs, regenerate the Git-derived manifest date, amend your
   unpublished commit, and confirm a full rebuild is clean. Push and update the
   PR description with concrete source changes and validation. Wait for CI and
   Netlify for the pushed revision; inspect the deployed changed pages. Record
   any failed or incomplete check honestly instead of claiming success.
8. End with a concise Chinese report: check time, specific new content since
   the last imported review, unresolved source errors, PR URL/commit and test/
   preview status. If nothing changed, say so. This final response is saved in
   the local run's `report.txt` and exposed as `latest-report.txt`; also maintain
   a latest-check section in the PR body so the result is visible on GitHub.
   Do not send email, Slack messages or unrelated notifications.

When blocked, preserve evidence and report the exact obstacle and required
decision. Do not silently downgrade a failed check, bypass approval review,
invent replacement data, or claim that a PR was updated without verifying it.
