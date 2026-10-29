# Conference heat

Implementation for a separate feature PR after #50. It is not deployed to
production until the rollout checks below pass and the PR is approved.

The user chose incremental statistics with five-minute freshness after CPU
measurements rejected full-scan and paginated rebuilding. Those prototypes have
been removed. The isolated preview completed functional, browser and workload
acceptance. Occasional measured CPU spikes remain explicit below; this is not a
guarantee that every request will remain below 10 ms.

## Product contract

- Public, conference-scoped popular forums and reports at `/:conf/popular`.
  Forum and report entries also show heat. Chronological schedules keep their
  existing ordering. Keynotes and untitled reports participate; opening slots do
  not contribute or dilute the report weights.
- One account setting, **参与统计 / Participate in statistics**, enabled by
  default for new and existing signed-in accounts. Signed-out local follows do
  not contribute. The account menu remains accessible when signed out.
- Turning the setting off withdraws that account's contribution on the next
  snapshot. It does not delete follows or change synchronization. Turning it
  back on includes current follows. Logging out is not withdrawal.
- Scores are weighted interest, never attendance, percentages or follower counts.
  No fabricated seed, minimum popularity, random boost or public follower list.
- Speaker follows, page views and presence do not contribute. No heartbeat,
  browsing history, history chart, cloud cron, queue or scheduler is added.

## Scoring

For a participating account and forum, let `d` indicate a direct forum follow
and `r` be the number of distinct directly followed reports in that forum:

```
forum contribution = max(3 * d, min(r, 3))
report contribution = 3, if the report is directly followed
                    = 1 / m, otherwise if its forum is followed (m reports)
                    = 0, otherwise
heat = round(100 * log2(1 + sum(account contributions)))
```

Forum and report contributions never stack twice for the same account. Multi-day
forums retain one identity. Unknown conference/forum/report IDs are ignored using
the currently published identity index. Durable report IDs survive reordering.

One forum follow yields forum heat 200. One direct report follow yields report
heat 200 and forum heat 100. Following a ten-report forum contributes heat 14 to
each report. Ten direct report follows yield heat 495. Zero interest yields zero.
These are score examples, not extra people. Rounded scores determine ranking;
forum ties use code order, report ties use source date/time and durable ID.

## Implementation and freshness

`heat-model.mjs` owns indexing and account weights. `heat.mjs` computes scores and
formats the public snapshot in SQLite, avoiding large per-row Worker conversions. `prepare-data.mjs` adds
`interest: { forums: { code: [report IDs] }, keynotes: [report IDs] }` to each
published catalog entry alongside its dataset hash. The Worker reads this small
index, never the full conference datasets. No runtime legacy-index reconstruction
or second data source is retained.

Migration `0002_heat.sql` adds participation and its revision to `users`, an
account contribution vector and identity-index hash to `sync_state`, a materialized
`heat_scores` table, and one public cache row. SQLite triggers apply only nonzero
differences between old and new account vectors to totals. Unchanged vectors do
not rewrite totals; zero totals are removed. User deletion also subtracts their
contribution. No second follow store or second synchronization implementation is
introduced: the vectors are derived indexes over the existing canonical bundle.

A sync write derives the account's vector from the published identity index,
then commits it with the bundle under the existing revision check and the
observed participation revision. Contribution changes and totals commit in the
same SQLite transaction. `PUT /api/statistics` atomically updates participation
and the vector, checking both setting and bundle revisions. Stale backups cannot
re-enable statistics. Withdrawal does not depend on R2 availability. Session and
sync responses carry the setting without another periodic request.

`GET /api/heat` reads materialized totals and caches a completed snapshot for
five minutes. A short lease prevents duplicate snapshot rebuilding; this does
not scan all account bundles. Identity-index freshness uses an indexed range
query. A structural publication change reconciles old account vectors on demand,
one account per request, withholding partial results until reconciliation is
complete. Text, timetable and list-order changes do not invalidate vectors.
Initial production has one existing account; large future identity changes can
require a longer cold reconciliation and should be checked during data review.
No scheduler, permanent job or separate migration backend is added.

Incomplete reconciliation returns 503 with `Retry-After: 1`; the browser retries
at most 25 requests and then offers manual refresh. Failed rebuilds release their
lease; an interrupted lease expires after one minute. Ordinary follows and
participation changes update totals immediately; public cached scores expire
within five minutes. There is no stale-while-revalidate cache. Logging out does
not withdraw a contribution.

The browser reuses a valid snapshot across routes, checks on entering relevant
pages / foreground / network restoration, and provides manual refresh. It does
not poll heat in the background. A screen already left open is a snapshot, not a
live counter. Dataset-hash mismatch, malformed responses and network failures
show unavailable rather than zero. The maximum public cache age is five minutes;
there is no stale-while-revalidate cache. Failed heat does not block offline agenda
reading. Only completed anonymous aggregates reach the public endpoint.

Existing automatic account polling changes from one minute to five minutes.
Local edits still upload after about two seconds; foreground, network restoration
and manual sync remain immediate. A second device left continuously in the
foreground may receive changes up to five minutes later.

## Account resource budget

Read-only account audit: 2026-10-29, SUPER. The reference window is the seven
complete UTC days October 22–28. Fora had no usage in that completed-day window;
October 29's partial-day deployment/testing traffic is excluded from projections.
The current production sync table held one account and two follows. That is a
baseline, not a forecast of conference traffic.

| Daily allowance | Free limit | Other services' highest observed day | Remaining for Fora | Operating budget after reserving another 20% of total quota |
| --- | ---: | ---: | ---: | ---: |
| Worker requests | 100,000 | 11,809 | 88,191 | 68,191 |
| D1 rows read | 5,000,000 | 132,079 | 4,867,921 | 3,867,921 |
| D1 rows written | 100,000 | 370 | 99,630 | 79,630 |

The maxima need not occur on the same day; subtracting each separately is
conservative. This is a forecast envelope, not reserved capacity. Other services,
malicious traffic, manual reloads and future growth can consume the same account
allowances. Static-asset requests served without Worker execution are not charged
as Worker requests. Cached API responses still invoke the Worker when fetched.

For an illustrative day, assume each active account spends two hours in the
foreground, has about 20 directly followed reports and one forum, and makes five
further direct-report changes. Budget 70 dynamic requests per active account:
about 40 session/sync/focus requests, 24 heat reads and a small margin. Accounts
using multiple devices, frequent manual refreshes, bulk imports or large-forum
changes consume more. Stored inactive accounts no longer multiply normal reads.

For `A` active accounts and `S` distinct scored forums/reports:

```
Worker requests: 70*A
D1 rows read:    1000*A + 288*(3*S + 20)
D1 rows written, returning users: 60*A
D1 rows written, all new users:  140*A
R2 index reads:  at most 7*A + 288/day in this scenario
```

These are conservative planning allowances, not billing guarantees. They allow
five-minute snapshot rebuilding around the clock, even though rebuilding stops
when nobody reads heat. The row-write allowance includes sync/login writes,
indexes and trigger deltas; first-time users include their initial contribution
vectors. Five large-forum edits are not equivalent to five report edits and must
be budgeted by the number of affected reports. Publication identity reconciliation
is additional, occasional work and is excluded from the ordinary-day table.

At a conservative 3,000 scored items (the isolated four-conference load fixture
produced 1,734 after excluding opening slots), the operating envelope is:

| Active accounts | Worker requests/day | D1 rows read/day | D1 writes, returning / all new |
| --- | ---: | ---: | ---: |
| 100 | 7,000 | 2,697,760 | 6,000 / 14,000 |
| 500 | 35,000 | 3,097,760 | 30,000 / 70,000 |
| 1,000 | 70,000 | 3,597,760 | 60,000 / 140,000 |

The 500-account scenario fits the reserved request/read/write budgets under these
assumptions. The 1,000-account scenario exceeds the request operating budget and,
on an all-new-user day, the write budget. Do not promise that capacity from the
current one-account production baseline. Per-request CPU remains independently
limited to 10 ms on Workers Free and requires deployed verification.

Local D1 regression measurements at 100, 500 and 1,000 accounts showed the same
29 snapshot-query rows and two freshness-check rows for a shared 11-item fixture.
Changing nine direct-report contributions read 79 rows and wrote 10; an unchanged
projection wrote only the canonical account row. The isolated deployed fixture
contains 500 synthetic accounts, each storing 20 report-slot follows and one forum
across all four conferences; opening slots are excluded from contributions. Final
vectors contain 32–58 entries per account (mean 43.764), across 1,734 scored targets.
The earlier seed, before excluding opening slots, wrote 23,771 rows including
sync-state/index overhead; user/session creation was measured separately. Its
snapshot query read 3,574 rows for 1,770 targets and wrote none. Those measurements
are historical test evidence, not the final fixture's exact cardinality. All
fixtures are synthetic and contain no production account data.

Other D1 databases occupied approximately 0.275 MB at the audit, leaving almost
all of the account's 5 GB allowance. Other R2 storage was approximately 161.3 MB
(including metadata). October 1–29 observations contained 22,246 other-service
GET/HEAD operations, conservatively including unsuccessful requests; no observed
other-service Class A writes. R2 has a 10 GB-month, 1 million Class A and
10 million Class B monthly free allowance. At 500 active accounts, index reads add at most about 117,428
Class B operations in a 31-day month under the model; normal conference/portrait reads and data
publishing remain additional Fora usage. Recheck the billing-period totals before
claiming a fixed remaining monthly allowance; a partial calendar-month observation
is not the subscription's completed billing cycle.

Official references, checked October 29, 2026:
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
[D1 pricing and index accounting](https://developers.cloudflare.com/d1/platform/pricing/),
[R2 pricing](https://developers.cloudflare.com/r2/pricing/).

## Deployed acceptance evidence

The isolated `fora-heat-preview` Worker uses its own D1 database and R2 bucket.
Desktop, mobile and dark-theme browser checks passed with 18 screenshots covering
the conference home (including expanded reports), forum, popular forums, popular
reports and account settings.
The checks include long-list visibility, horizontal overflow and browser errors.
Real synthetic sessions exercise the actual Worker and D1; preview GitHub login is
disabled. Local provider simulation does not claim real OAuth authorization.

The October 29 capture of version `8c7015d3-7bf6-4c8a-87ca-bb05b226c806` did **not**
pass the free CPU target: traced sync writes took 11–25 ms and cold snapshots
7–19 ms, while cached heat reads took 1–6 ms. All returned successfully, but
successful requests alone were not sufficient to accept that implementation.

Version `48efb0b2-8209-44f8-814a-219580c047ab` (commit `1a2125b`) keeps snapshot
assembly and storage in one D1 statement and avoids a request-body Blob copy.
Real-browser requests exercised the 500-account fixture, with these tail samples:

| Operation | Captured CPU samples | Median | Maximum | Samples above 10 ms |
| --- | ---: | ---: | ---: | ---: |
| Initial follow-write run | 11 of 20 requests | 4 ms | 13 ms | 3 |
| Subsequent continuous follow-write run | 51 of 60 requests | 4 ms | 13 ms | 2 |
| Forced expired-cache rebuild | 4 of 5 requests | 3.5 ms | 4 ms | 0 |
| Cached heat read | 20 of 25 requests | 1 ms | 2 ms | 0 |
| Participation toggle | 4 of 4 requests | 4.5 ms | 5 ms | 0 |

Every exercised request succeeded and account analytics reported no invocation
errors in this deployed-version window. Tail sampling did not capture every
request; these maxima apply to captured samples, not all possible requests.
The continuous-write sample's two spikes were 11 and 13 ms; the remaining 49
were at most 10 ms. No `exceededCpu` outcome was observed.

The [Workers CPU limit](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)
is 10 ms on Free, with explicit flexibility for infrequent overruns. Acceptance
uses that platform contract rather than an invented zero-spike guarantee. The
common path is below the limit; occasional spikes remain a rollout risk to
review, particularly for large imports or different traffic distributions. Do
not claim that successful HTTP responses alone prove unrestricted free capacity.
No paid plan, extra service or relaxed freshness requirement was introduced.

Production deployment and custom domains were verified unchanged; the production
app, session endpoint and public catalog all returned HTTP 200. Resource inventory
changes were limited to the preview Worker, D1 database and R2 bucket.

## Acceptance and rollout

- Model: weights, duplicate logical follows, caps, indirect distribution,
  keynotes, unknown IDs, empty data, reorder, multi-day and conference isolation;
  incremental deltas produce the same result as a complete reference calculation.
- Worker/D1/R2: default participation, origin/session/body checks, setting CAS,
  concurrent updates, withdrawal without losing follows, sync independence,
  cache lifetime, lease recovery, source-identity reconciliation and population tests.
- Browser: public ranking, account menu signed out, two-device participation,
  follow/unfollow/import, weighted report metadata and stable anchors,
  unavailable/invalid/hash-mismatch responses, caching, desktop/mobile layout,
  no overlapping actions, and the five-minute/two-second sync timing contract.
- Existing conference, source-gap, portrait, anchor, multi-day, offline and live
  clock tests remain required, alongside lint/build and Cloudflare integration.

Before production rollout, publish a catalog containing the interest index using
current production datasets; do not replace curated live data with older local
fixtures. Preview it independently. Apply `0002_heat.sql` to production D1 only
as part of the approved rollout, then deploy the verified application. Existing
application behavior remains valid while the additive index/schema are staged.
Keep the prior Worker version and immutable data manifest as rollback targets;
do not remove DNS, change other account services or deploy preview database
bindings to production. Preview acceptance does not substitute for production
OAuth authorization. New feature production acceptance remains pending until
that rollout occurs.
