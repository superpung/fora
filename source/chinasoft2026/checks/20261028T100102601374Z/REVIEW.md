# October 28 evening source review

Observed October 28, 2026, 18:01–18:02 Asia/Shanghai. The check is complete:
94 active HTML pages, three retained withdrawn pages and 626 active portrait
URLs are accessible. The last complete check and last imported review are both
the October 28 14:31–14:32 observation. Six active pages changed; no HTML path
was added or removed. All three withdrawn pages remain byte-identical.

## Actual additions, replacements and corrections

- The steering committee page replaces honorary chair 陈雨露 with 龚克 and
  supplies an explicit new portrait. Preserve its published 校长 title without
  inferring an institution or consulting unrelated biographies. The five-person
  honorary roster otherwise remains unchanged.
- The sponsorship committee adds 黄丽丽 and 陆彦州 as members, both explicitly
  at 天津大学, with portraits. Existing leaders remain 赵英全 and 王伟.
- Four committee subpages supply nine existing leaders' affiliations:
  publication 姜佳君/天津大学 and 张静宣/南京航空航天大学; publicity
  王栋/天津大学, 辜文蔚/南开大学 and 张重群/南开大学; sponsorship
  赵英全/天津大学 and 王伟/南开大学; volunteer organization
  姜艳杰/天津大学 and 孙永谦/南开大学.
- Registration's add-on activity price-period headers change from
  09.1–10.20 / 10.21–11.8 to 09.1–10.25 / 10.26–11.8. Price values do not
  change. The main registration periods already used these dates; this is
  their remaining add-on table correction, not a new conference timetable.
- Three active portrait references are added and 陈雨露's reference is removed.
  All 623 other active hashes are unchanged. The prepared manifest contains
  630 resources: 626 active and four retained C4 references. Historical portrait
  assets are retained; no current card is assigned the removed person's image.

## Import and remaining gaps

Import the six reviewed pages directly from this observation archive, keeping
original bytes separate from curated HTML. All 15 existing curated-page
corrections have exactly the same line changes as the afternoon import. This
includes the five committee heading prefixes; no new typography override is
needed. R32's obsolete standalone role paragraphs remain absent upstream.

The new unit fields exposed a general adapter issue: merging a repeated
same-role roster retained a later portrait but discarded its explicit unit when
the overview listed the person first. Retain an explicitly supplied missing
unit as well as the portrait. A synthetic two-page regression fails before the
fix and passes in both page orders afterward. This does not use affiliations
to establish identity and does not change shared web application code.

All programme-related JSON is byte-equivalent as data to the afternoon import:
67 entries, 510 programme items, 65 breaks, 407 abstracts and 460 guarded
enrichment annotations. No report title, abstract, index, date, time or room
changes. No enrichment rewrite is needed. E6 still lacks its programme;
C1/C3/C4/C5 still lack individual slots; C5 has no published room or clock.
The main-conference individual keynotes remain unpublished. Missing report
abstracts, R33's missing biography, the seven substantive source notes and
known distinct-person keys are unchanged. See the updated gap inventory.

## Validation

- Original and curated archives and all 192 member hashes verify. All 626
  active input hashes and 630 prepared portrait output hashes match.
- All four conferences rebuild and pass schema/person/time validation. Both
  generated ChinaSoft copies match; the repeated rebuild is byte-identical.
- All 31 adapter/checker tests pass. The former honorific-roster assertion was
  updated for the published replacement after correctly detecting the change.
- Web lint and production build pass. The existing large-dataset chunk-size
  warning remains non-fatal.
- All seven web/browser suites pass: 34 shared regressions, every published
  forum/report row, 627 distinct decoded portraits, links, topics, AI switching,
  follows/exports, source notes and cross-date programmes. The clock audit passes
  all 65 screenshots, including foreign device timezones, midnight and reminders.
- Twelve additional desktop/mobile committee captures verify the changed
  rosters, all nine units and the three new portrait hashes. Changed screenshots,
  the topic map and the live morning overview were visually inspected; no
  horizontal overflow or browser runtime error was observed.
- Post-push CI and Netlify deployment verification are recorded in the PR's
  latest-check section for the exact pushed revision.

The complete observation advances the successful comparison baseline. No
inaccessible URL, fabricated programme change, merge or release is involved.
