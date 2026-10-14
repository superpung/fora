"""Regression checks against the committed 2026 source snapshot.

Run with: uv run python -m unittest discover -s source/chinasoft2026
"""
import unittest

from build import detail, load, people, table_rows


class ProgrammeTests(unittest.TestCase):
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
        self.assertEqual([p["name"] for p in people("李必信 孙小兵 裴玉", flags)],
                         ["李必信", "孙小兵", "裴玉"])
        self.assertFalse(flags)

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

    def test_profile_does_not_silently_replace_pending_speaker(self):
        forum = detail("academic-forum", "supply-chain-security")
        talk = next(t for t in forum["talks"] if t["start"] == "10:00")
        self.assertEqual(talk["speakers"], [])
        self.assertIn("廖楠", forum["extra"]["unmatched_profiles"])

    def test_overview_date_rowspans(self):
        overview = load("pages/agenda/agenda-overview/index.html")
        rows = [row for row, heading in table_rows(overview.select_one("table")) if not heading]
        self.assertEqual(len(rows), 13)
        self.assertEqual(rows[-1][0], "11月8日 周日")
        self.assertEqual(rows[-1][2], "CCF形式化方法专委会年会")


if __name__ == "__main__":
    unittest.main()
