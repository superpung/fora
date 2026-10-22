# October 22 evening source review

Observation: 2026-10-22 15:03:57–15:04:47 UTC (23:03–23:04 Asia/Shanghai).

All 94 accessible HTML responses and 555 portrait fingerprints match the
[18:00 observation](../20261022T100053520657Z/REVIEW.md) exactly. No further
content changed during the evening. Relative to the October 21 imported source,
twelve pages changed and six portraits were added; see that review for the
committee rosters, S2 title corrections and R8 affiliation change.

The committee-meeting index still returns HTTP 404. This observation remains
failed/incomplete, retaining the October 21 morning successful baseline.
Previously stored meeting information is preserved; an unavailable page does
not imply cancellation or authorize deletion. All archived page hashes and the
archive hash were checked. All 555 imported portrait source/output hashes match
the observation and local assets. The ten deliberate curated HTML differences
are unchanged and remain necessary.

## Recovery and validation

The 18:00 cron job acquired the source and prepared the import, but its Codex CLI
process exhausted its usage allowance before completing validation or pushing.
Its failed status and worktree are retained. This interactive run independently
compared the current source, reviewed the pending diff, and recovered the
uncommitted files into the PR checkout. No second agent was started, and no
concurrent process edited either branch.

All four datasets pass schema/person/clock validation and all 24 Python tests
pass. Web lint/build pass. Browser checks additionally cover all names, units,
explicit portraits and the first/last visible members of the local advisory and
organizing committees on desktop/mobile. The complete browser suite passes: 34 shared core cases, eight shared UI
cases, eight permalinks, all 52 programme audits, gap/follow/export checks,
multi-day views and the live-clock suite. All 155 captures (78 source, twelve
multi-day and 65 live) were visually inspected. A complete rebuild reproduces
every dataset and the manifest byte-for-byte. CI and deployed-preview results
are maintained in the PR description. The automation's CLI allowance remains an operational limitation; this
manual recovery does not claim that future scheduled runs can complete.
