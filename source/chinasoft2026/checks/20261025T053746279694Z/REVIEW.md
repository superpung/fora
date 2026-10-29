# October 25 source review

Observation: 2026-10-25 05:37:45–05:38:37 UTC (13:37–13:38 Asia/Shanghai).
Compared with the [October 24 daily observation](../20261024T100040420152Z/REVIEW.md),
on imported revision `14eec58ac62744792c7026a49b7bc7036c606413`.

## Published changes

- The local advisory committee moves 王劲松 (天津职业技术师范大学) from
  member position 16 to 13, immediately after 汪定 and before 杨亮. The two
  chairs and 18 members, their affiliations and portraits are unchanged.
- The committee overview changes five role labels from 主席 to 负责人:
  finance, publicity, sponsorship, publication and volunteer organization.
  These now match the dedicated pages and our previously reviewed data-only
  correction. Import the original overview bytes; its override is no longer
  necessary. Dedicated page headings still need their committee-name prefixes.
- All eight previously broken I8 portrait URLs recover: 刘振宇, 刘爽, 岳赟,
  张卿, 柳义利, 王子谋, 肖涛 and 郭威俊. Restore the explicit image tags,
  preserving the existing 岳赟/蚂蚁 name-affiliation boundary correction.
- The existing volunteer committee portrait URL for 徐英帅 changes bytes.
  Refresh its prepared asset and hash rather than inferring any new identity.
- No programmes, report titles, speakers, abstracts, biographies, dates, times
  or rooms change. Enrichment and substantive source notes are unchanged.

## Coverage and curation

Two of 95 accessible HTML pages change; no page references are added or removed.
The committee-meeting index still returns HTTP 404, leaving 96 active references
and an incomplete observation. The successful baseline remains October 21
morning; automatic differences against it include earlier imported changes and
must not be reported as new today.

All 596 active portrait references are available: eight recover from HTTP 404,
one existing resource changes, and 587 fingerprints remain unchanged. There are
no added or removed portrait references. All original snapshots and previously
stored portrait assets remain; a broken source link never establishes deletion.

Only the two changed committee pages and I8's restored image tags are imported.
I8's original HTML is itself unchanged from October 24. Other deliberate
curated corrections remain intact on eleven HTML pages (previously twelve).
No adapter or shared application behavior
changes; the existing snapshot regression now expects the recovered I8 portraits.

The inventory remains 66 entries, 56 published programmes, 454 items, 60 breaks,
378 attached abstracts, one unmatched abstract and 415 separate AI annotations.
Nine substantive notes remain; ten detailed programmes are still unpublished,
with four undated entries and seven lacking rooms/clocks. These sets overlap.
See the [gap inventory](../../../../data/CHINASOFT2026_GAPS.md).

## Validation

Both observation archives and all 95 original / 93 curated HTML member hashes
were verified independently. All 596 downloaded source hashes match this
observation, and every prepared output hash/size passes (594 unique assets).
The nine added/replaced portraits were visually checked. Whole-dataset comparison
confirms only the eight I8 photos, 徐英帅's photo, advisory member/source-roster
order and source fingerprint change; both generated copies are byte-identical.
All four datasets pass schema/person/clock validation, all 26 Python tests pass,
and web lint/build pass. The complete browser suite passes, including all 594
unique portraits, source associations, committees, exports, multiday behavior
and 65 live-clock captures covering overseas clocks, midnight and reminders.
Affected local committee/I8 captures were reviewed. Final screenshot review,
deterministic rebuild, CI and deployed-preview results are recorded in the PR.
