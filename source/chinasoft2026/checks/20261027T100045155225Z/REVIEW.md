# October 27 evening source review

Observation: **2026-10-27 18:00:45–18:01:43 Asia/Shanghai**. Complete: all
94 active HTML pages and three withdrawn pages are accessible. All 97 original
response hashes, 95 curated response hashes and both archive hashes pass.
The local complete-check baseline advances from `20261027T080809032302Z` to this observation;
that does not imply all observed changes have been imported.

## Actual changes since the last imported review

Two active HTML pages changed; 92 active and all three withdrawn pages are
byte-identical. No navigation reference was added or removed. All 605 active
portrait status/hash records match the 16:08 observation: 603 images and two
confirmed HTTP 404 responses. No image replacement or recovery occurred.

- **R2, report 3:** 周维's timetable affiliation changes from 蚂蚁集团 to
  蚂蚁数科. His profile heading and biography are rewritten to describe his
  industrial work, research and AiWork Agent Harness responsibilities. The
  title, abstract, November 6 10:40–11:10 slot and portrait are unchanged.
  The exact response is imported locally; no source-specific cleanup is needed.
  The existing guarded AI summary/topics remain valid because their source
  title, abstract and report index are unchanged.
- **S6, report 10:** the November 7 16:25–16:50 slot changes from 朱晨's
  desktop operating-system report to 任慰's
  面向关键领域装备的智显算控麒麟工业操作系统探索与实践（特邀）.
  The person-card heading, abstract and biography change to 任慰 and industrial
  operating systems. However, the card still prints the old report title
  从"人机交互"到"AI原生"—银河麒麟桌面操作系统的探索与实践, and its image
  URL, `alt="朱晨头像"` and image bytes remain exactly the previous portrait.
  The original response is archived, but **S6 import is pending a user decision**.
  A question requests approval to import the explicit new text, retain a title
  discrepancy note and remove only the stale portrait tag from curated HTML.
  No new identity/photo association is assumed. The old guarded `S6#9`
  annotation must be replaced if the new report is imported; it is not applied
  to the new report in the current local dataset.

## Gaps and curation rechecked

The two inaccessible URLs remain:

- <https://chinasoft.ccf.org.cn/2026/images/academic-forum/学术论坛/唐滨.png> — HTTP 404.
- <https://chinasoft.ccf.org.cn/2026/images/academic-forum/学术论坛/王晔晖.png> — HTTP 404.

Both are known R16 source-image defects, not failed HTML coverage. The source
checker records them explicitly and completes under its documented contract.
All 607 prepared portrait records pass their local output hashes; the 603
accessible active references also match their imported source hashes. The four
retained-only C4 image references remain in unchanged retained HTML.

Every other source page is byte-identical to the imported review, so the known
programme, abstract, clock, room and identity gaps remain unchanged. In particular,
R25/R33/E6 are pending, keynote details and M1–M6 dates remain unpublished,
and the six existing substantive notes remain. The new S6 contradiction is an
additional observed source issue pending import, not a seventh generated flag yet.

The fourteen existing curated-page differences were reviewed individually:
R30/R32/E4 chair separators, R16 broken-image omissions, R34 table/guest
separators, overview/T1 headers, E2 host separator, I8 name/unit separator and
five dedicated committee prefixes. All remain justified and unchanged. R32's
four standalone role paragraphs remain absent upstream; do not reintroduce or
strip substantive biographies. The overview's former five role-label overrides
remain resolved. Known distinct people retain their reviewed identity keys.

The two checker-only pages and three retained competition pages account for
coverage differences versus curated input; none is a new publication or a
cancelled event. Dataset counts remain 67 entries, 492 programme items, 64
breaks, 391 source abstracts, 445 AI annotations and 607 prepared portraits.

## Validation and publication state

The local R2-only candidate passes the full offline build, schema/person/time
validation, all 29 adapter/checker/fetch tests (including four checker tests),
web lint and production build. A second full build is byte-identical and both
generated dataset copies match. Targeted desktop/mobile R2 checks pass, including the expanded revised biography,
visible portraits, clock labels and absence of overflow/browser errors. All four
screenshots were visually inspected. The complete `pnpm test` run failed in the mobile committee visibility
assertion at `web/tests/conference-audit.mjs:47` (called at line 232). Shared
core/UI suites, permalink checks, all 604 distinct portrait decodes and every
published programme row passed before that failure. A separate diagnostic of
the same six committee edges passed (all member/ancestor opacities were 1), so
the failure is not yet reproduced or explained; no speculative code change or
passing full-suite claim is made. The remaining gap, multi-day and live-clock suites pass independently;
the clock audit captures 65 screenshots and checks overseas clocks, automatic
ticks, midnight and reminders. Representative desktop/mobile live screenshots
were visually inspected. Six of seven suites pass, but the complete suite is
**failed**, not successful. The initial failing log is retained in
`browser-suite.log`, with the independent diagnostic in `committee-diagnostic.json`.
Raw R2 HTML retains its original CRLF bytes; whitespace checking passes with
Git configured to recognize CR at end of line.

The remote PR was verified as #38, branch `data/chinasoft2026`, revision
`e82ebe52607ba5fa5bad2c08ad6d1557434d0dff`. This review and the R2 candidate
are local work pending resolution of the S6 question; no new commit or push is
claimed. CI/preview results from the earlier revision do not validate this work.

The PR latest-check section was updated through the GitHub REST API and read
back to confirm exact text and unchanged remote head. `gh pr edit` first failed
because its unrelated organization-field GraphQL query needs `read:org`; the
existing `repo` scope sufficed for the authorized REST PR-body update. No token
permissions were changed. Local browser logs are at
`/tmp/chinasoft2026-20261027T100001Z-web-tests.log`; targeted screenshots are at
`/tmp/chinasoft2026-20261027T100001Z-r2/`.

No source/data/code commit was created or pushed. The publication steps, amended
Git-derived manifest and exact-new-revision CI/Netlify checks remain outstanding.
The existing deployed preview is the earlier revision and was not represented
as validation of the local candidate. The user decision and unexplained browser
failure remain blockers for declaring this maintenance run complete.
