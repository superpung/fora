"""Regression checks against the committed 2026 source snapshot.

Run with: uv run python -m unittest discover -s source/chinasoft2026
"""
import unittest
import json

from build import detail, load, people, table_rows, committees, profiles, RAW, ROOT
from people import read_person, person_problem


class ProgrammeTests(unittest.TestCase):
    def test_every_profile_retains_its_identity_and_portrait(self):
        for page in RAW.rglob("*.html"):
            soup = load(page.relative_to(RAW))
            cards = soup.select(".speaker-member")
            if not cards:
                continue
            with self.subTest(page=page.name):
                flags = []
                parsed = profiles(soup, flags)
                self.assertEqual(len(parsed), len(cards))
                self.assertFalse(flags)
                self.assertEqual(sum(bool(p["person"].get("photo")) for p in parsed.values()),
                                 sum(bool(card.find("img")) for card in cards))
        forum = detail("academic-forum", "intelligent-software-dev")
        speaker = forum["talks"][2]["speakers"][0]
        self.assertEqual(speaker["name"], "狄鹏")
        self.assertTrue(speaker["bio"])
        self.assertTrue(speaker["photo"])
        self.assertTrue(forum["talks"][2]["abstract"])

    def test_built_schedule_windows_and_enrichment_coverage(self):
        data = json.loads((ROOT / "data/chinasoft2026.json").read_text())
        for day in data["days"]:
            starts = [b.get("start") or "99:99" for b in day["blocks"]]
            self.assertEqual(starts, sorted(starts))
        forums = {f["code"]: f for f in data["forums"]}
        for code in ("R10", "R13"):
            self.assertIsNone(forums[code]["session_period"], "A full-day programme is not a morning-only forum")
        self.assertEqual((forums["E6"]["start"], forums["E6"]["end"]), ("14:10", "15:10"))
        for code in ("C5", "C6"):
            self.assertIsNone(forums[code]["start"])
            self.assertIsNone(forums[code]["end"])
        for forum in forums.values():
            for talk in forum["talks"]:
                if talk.get("type") == "talk":
                    self.assertTrue(talk["enrichment"]["topics"], (forum["code"], talk["title"]))
                    self.assertEqual(talk["enrichment"]["generated_by"], "ai")

    def test_every_timed_source_row_is_retained(self):
        categories = ("academic-forum", "industry-forum", "education-forum",
                      "regular-forum", "special-issue-forum")
        import re
        for category in categories:
            index = load(f"pages/agenda/{category}/index.html")
            for link in index.select("[onclick]"):
                match = re.fullmatch(r"loadAgenda\('([^']+)',\s*'([^']+)'\)", link["onclick"])
                if not match:
                    continue
                cat, slug = match.groups()
                with self.subTest(forum=slug):
                    forum = detail(cat, slug)
                    source = load(f"pages/agenda/{cat}/templates/{slug}.html")
                    expected = []
                    for table in source.select(".forum-table"):
                        for row in table.select("tr"):
                            cells = row.find_all("td", recursive=False)
                            if cells and re.search(r"\d+:\d+", cells[0].get_text()):
                                expected.append(" ".join(cells[1].get_text(" ").split()))
                    actual = [t["title"]["zh"] for t in forum["talks"]]
                    actual += [b["name"] for b in forum["breaks"]]
                    self.assertCountEqual(actual, expected)

    def test_rowspanned_hosts_do_not_replace_speakers(self):
        forum = detail("education-forum", "formal-methods")
        talks = forum["talks"]
        self.assertEqual(talks[1]["speakers"][0]["name"], "刘万伟")
        self.assertEqual(talks[1]["extra"]["hosts"][0]["name"], "邓玉欣")
        self.assertEqual(talks[-1]["extra"]["hosts"][0]["name"], "李晓红")
        self.assertEqual(forum["breaks"][0]["name"], "茶歇")
        self.assertTrue(all(t.get("abstract") for t in talks))

    def test_short_names_titles_and_affiliation_slashes(self):
        flags = []
        result = people("金芝 教授 武汉大学/北京大学", flags)
        self.assertEqual(result[0]["name"], "金芝")
        self.assertEqual(result[0]["affiliation_raw"], "教授 武汉大学/北京大学")
        self.assertEqual([p["name"] for p in people("李必信 孙小兵 裴玉", flags, known_names={"李必信", "孙小兵", "裴玉"})],
                         ["李必信", "孙小兵", "裴玉"])
        self.assertFalse(flags)

    def test_short_companies_are_affiliations_not_speakers(self):
        for name, affiliation in (("金意儿", "华为"), ("陈驰", "华为"), ("狄鹏", "昆仑芯"), ("杨经纬", "百度")):
            with self.subTest(name=name):
                flags = []
                self.assertEqual(people(f"{name} {affiliation}", flags),
                                 [{"name": name, "affiliation_raw": affiliation}])
                self.assertTrue(person_problem(affiliation))
                self.assertFalse(flags)

    def test_honorifics_stay_attached_to_people(self):
        for name, title in (("梅宏", "院士"), ("柴立元", "校长"), ("金芝", "教授")):
            person, problem = read_person(f"{name} {title}")
            self.assertIsNone(problem)
            self.assertEqual(person, {"name": name, "title": title})
            self.assertTrue(person_problem(title))
        groups, _ = committees()
        honorary = next(g for g in groups if g["role"]["zh"] == "荣誉主席")
        self.assertEqual([p["name"] for p in honorary["members"]],
                         ["林惠民", "梅宏", "吕建", "柴立元", "陈雨露"])
        self.assertEqual(len({g["role"]["zh"] for g in groups}), len(groups))

    def test_pending_and_collective_credits_are_flags(self):
        for raw in ("待更新", "所有嘉宾", "论坛组委会", "姓名（待定） 华为"):
            with self.subTest(credit=raw):
                flags = []
                self.assertEqual(people(raw, flags), [])
                self.assertTrue(flags)

    def test_time_conflicts_are_preserved(self):
        forum = detail("academic-forum", "agentic-ai-testing")
        self.assertEqual(forum["extra"]["published_window"]["end"], "18:20")
        self.assertEqual(forum["talks"][-1]["end"], "18:30")
        self.assertTrue(forum["talks"][-1]["flags"])

    def test_updated_speaker_and_multiline_abstract(self):
        forum = detail("academic-forum", "supply-chain-security")
        talk = next(t for t in forum["talks"] if t["start"] == "10:00")
        self.assertEqual(talk["speakers"][0]["name"], "廖楠")
        self.assertTrue(talk["speakers"][0]["photo"])
        self.assertTrue(talk["abstract"])
        self.assertNotIn("unmatched_profiles", forum["extra"])
        self.assertIn("本报告围绕软件供应链中的风险发现", forum["talks"][0]["abstract"])

    def test_overview_date_rowspans(self):
        overview = load("pages/agenda/agenda-overview/index.html")
        rows = [row for row, heading in table_rows(overview.select_one("table")) if not heading]
        self.assertEqual(len(rows), 13)
        self.assertEqual(rows[-1][0], "11月8日 周日")
        self.assertEqual(rows[-1][2], "CCF形式化方法专委会年会")


if __name__ == "__main__":
    unittest.main()
