# Official-source review: 2026-10-15

Observed 2026-10-15 05:54:45–05:55:14 UTC (13:54:45–13:55:14 UTC+08:00).
Compared with the curated importer input at Git revision
`ee0e9d2ca7a21ee9555b25573da23e608d4d09ba`, last reviewed on October 14.
This check does not modify the imported dataset or its curated source files.
All times below are conference-local. These observations do not establish the
exact upstream publication times.

## Newly linked programmes

| Code | Official title | Date | Published window | Room | Reports / other items / breaks |
| --- | --- | --- | --- | --- | --- |
| R6 | 大模型辅助软件开发能力评测技术论坛 | November 7 | 15:20–18:20 | Floor 2, room 17 | 6 / 0 / 1 |
| R7 | 青年人才成长论坛 | November 7 | 15:20–18:20 | Floor 1, banquet hall 2 | 8 / 0 / 1 |
| R8 | 具身智能机器人与系统软件论坛 | November 6 | 09:00–17:20 | Floor 2, room 19 | 14 / 4 / 2 |
| R11 | 软件前沿技术导引论坛 | November 6 | 14:00–17:00 | Floor 1, banquet hall 2 | 3 / 0 / 1 |
| R17 | 分布式软件系统韧性保障论坛 | November 7 | 15:20–18:20 | Floor 2, room 13 | 8 / 0 / 1 |

Total: 39 reports, four opening/closing items and six breaks. All rooms share
the existing conference hotel. R8 has separate morning/afternoon tables; retain
both, including their opening/closing rows. R6's final listed report ends at
17:30; do not extend it to the forum's printed 18:20 end.

Sources:
[R6](https://chinasoft.ccf.org.cn/2026/pages/agenda/academic-forum/templates/llm-dev-evaluation.html),
[R7](https://chinasoft.ccf.org.cn/2026/pages/agenda/academic-forum/templates/young-talent-growth.html),
[R8](https://chinasoft.ccf.org.cn/2026/pages/agenda/academic-forum/templates/embodied-intelligence-robot.html),
[R11](https://chinasoft.ccf.org.cn/2026/pages/agenda/academic-forum/templates/software-frontier-tutorial.html),
[R17](https://chinasoft.ccf.org.cn/2026/pages/agenda/academic-forum/templates/distributed-resilience.html).

## Existing pages

- The [programme committee](https://chinasoft.ccf.org.cn/2026/pages/intro/committee-program.html)
  now publishes 195 active member records instead of the pending placeholder.
  Three entries, 任晗, 谢筱恒 and 许文强, have no affiliation in the source.
  Keep those fields absent; do not infer organizations from unrelated records.
- R14 adds bold formatting to names and prefixes the biographies of 黄凯锋 and
  凌祥 with their names. Its report schedule is unchanged. The existing
  timetable/profile title discrepancy remains.
- R16's entry is commented out in the academic navigation. Its direct detail
  URL still returns HTTP 200 with exactly the same bytes as the curated page.
  This is a withdrawn link, not evidence of cancellation or deleted content.
  The eight removed active portrait references belong to this withdrawn page.
- R32 differs from curated input only by the four known role paragraphs.
  This is the documented local curation difference, not a new upstream change.
- The homepage, introduction, overall schedule, hotel/transport/registration
  pages and all other previously captured active pages are byte-identical.
  Existing source discrepancies on unchanged pages remain unresolved.

## Portrait observations

The 341 active portrait URLs comprise 340 successful images and one HTTP 404.
There are 51 newly referenced URLs, eight no longer referenced by active pages,
four existing URLs with changed bytes and 286 unchanged existing images.
New references can reuse people already appearing elsewhere; they are not a
count of newly announced people. The missing image is included in the 51.

- R17's 王林章 image returns 404:
  `https://chinasoft.ccf.org.cn/2026/images/academic-forum/学术论坛/王林章.png`.
  Recheck before importing; do not silently substitute another portrait.
- Original image bytes changed at the existing URLs for 刘杨, 苏亭, 王莹 and
  高翠芸. This proves a resource change, not necessarily a visibly different
  photograph. Refresh and inspect them when preparing the data update.

Exact URLs, old hashes and new hashes/statuses are in `curated-manifest.json`
and `manifest.json`; the classified lists are in `report.json`.

## Coverage and pending import

The checker captured 59 active HTML pages plus the still-accessible withdrawn
R16 page. Of the 59, 57 are within the existing importer's crawl scope and two
are newly monitored `callforpaper`/`history` pages. Those two are not claimed as
newly published pages. Active detailed programmes increased from 27 to 31:
five added and one navigation entry withdrawn.

These updates were subsequently imported in the October 15 PR refresh. The
original observation above remains unchanged; the import retains accessible R16
and omits only the broken R17 image tag. Read `data/CHINASOFT2026_GAPS.md` before
refreshing. In particular, preserve the two distinct 李佳 identities in R7,
review new enrichment against source titles, handle R8's two tables, and reapply
the deliberate R32 data edit only to curated input. Do not add uncertainty
notes to the two known distinct people.

Two earlier attempts are retained with `status: failed`: the first stopped on
the newly encountered missing portrait; the second on a TLS transport failure.
Neither was selected as the comparison baseline. The complete run checked all
references, explicitly records the missing portrait, and archives original HTML.
