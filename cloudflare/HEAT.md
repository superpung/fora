# Conference heat

Implementation for a separate feature PR after #50. It is not deployed to
production until the rollout checks below pass and the PR is approved.

The author chose incremental statistics with five-minute freshness after CPU
measurements rejected full-scan and paginated rebuilding. Those prototypes have
been removed. Actual Cloudflare CPU and write-budget acceptance is still in
progress; successful HTTP responses alone are not sufficient evidence.

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
actually produced 1,770), the operating envelope is:

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
contains 500 synthetic accounts, each following 20 reports and one forum across
all four conferences, with 35–59 projection entries per account (mean 44.542).
Seeding those vectors wrote 23,771 rows including sync-state/index overhead;
user/session creation was measured separately. The deployed snapshot query read
3,574 rows for all 1,770 aggregate targets and wrote none. These fixtures contain no real
production account data.

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
