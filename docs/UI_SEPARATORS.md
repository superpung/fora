# Middle-dot decisions

The user prohibited new application-authored middle-dot separators on October 31,
2026 and subsequently reviewed every existing use. The table records the final
scope, not only the latest edit. Original conference content is preserved.

| ID | Surface | Current decision and implementation |
| --- | --- | --- |
| 1 | Country and city | Retain `中国·天津` with no padding spaces. The shared `CityLocation` component allocates a centered 1em separator in hub/home; the poster renderer allocates the equivalent width in canvas. |
| 2 | Home date and location | Remove the separator; calendar and pin icons identify separate fields. |
| 3 | Home keynote groups | Use spaced title, clock/period and report count. |
| 4 | Home filter summary | Use separate search/star metadata with spacing. |
| 5 | Conference picker | Use separate calendar/date and pin/city metadata. |
| 6 | My Day | Shared rounded forum-code badge before the name. Preserve the time column. |
| 7 | Planner | Shared badge before the forum name. Report title and speakers precede metadata. |
| 8 | Timeline without reports | Clock/time followed by spaced publication status. |
| 9 | Live date | Calendar icon with date and weekday. |
| 10 | Upcoming forum group | Forum icon/title and pin/room count. |
| 11 | Committee | Retain the affiliation/title separator as requested. |
| 12 | Organizations | Shared forum-code badge before the forum name. |
| 13 | Search results | Structured metadata items separated by layout gaps; forum codes use the shared badge. Ranking inputs are unchanged. |
| 14 | Notifications | Use a colon between the countdown and session/count text. |
| 15 | Share posters | Remove the report/count separator and, after explicit confirmation, the multi-speaker separator. Use whitespace between speakers. The forum identifier uses a neutral rounded badge. |
| 16 | Markdown export | Use an em dash between the agenda label and conference name. |

Date/time separators in heat rows, forum/session metadata, live upcoming items
and report-poster timestamps were already removed. The forum identifier badge
also applies to Home, forum details, speaker report lists, Now, topic reports/groups
and similar talks.
`ForumCode` / `ForumIdentity` own the HTML presentation; the offline canvas
renderer draws the matching neutral badge at poster scale.

Original conference punctuation is preserved verbatim. Content-specific inventories
and examples belong in external maintenance storage.
