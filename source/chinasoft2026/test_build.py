"""Regression checks against the committed 2026 source snapshot.

Run with: uv run python -m unittest discover -s source/chinasoft2026
"""
import unittest
import json

from build import detail, load, people, table_rows, committees, profiles, RAW, ROOT
from people import read_person, person_problem


class ProgrammeTests(unittest.TestCase):
    def test_october_21_placeholders_replacements_and_resolved_biography(self):
        data = json.loads((ROOT / "data/chinasoft2026.json").read_text())
        forums = {f["code"]: f for f in data["forums"]}
        self.assertEqual(len(forums), 66)
        self.assertEqual(sum(f["detail_extracted"] for f in forums.values()), 48)
        for code in ("R9", "R25", "R33", "R34", "R35", "E2", "E4", "E5", "E6", "I5", "I7", "I8"):
            forum = forums[code]
            self.assertEqual(forum["agenda_status"], "not_published")
            self.assertFalse(forum["talks"])
            self.assertIn("内容正在更新中", forum["extra"]["source_notice"])
            if code != "E6":
                self.assertIsNone(forum["day_date"])
                self.assertIsNone(forum["start"])
        self.assertEqual(forums["E2"]["extra"]["source_code"], "E1")
        self.assertEqual(len(forums["E2"]["flags"]), 1)
        self.assertTrue(forums["E1"]["talks"])
        self.assertNotIn("source_navigation_status", forums["R16"]["extra"])
        for code, index, name, title, time in (
            ("P3", 6, "钮鑫涛", "Datalog程序的自动故障定位", "14:45"),
            ("R19", 4, "马全一", "基于 Rust 的 Monorepo 架构体系实现", "11:20"),
        ):
            talk = forums[code]["talks"][index]
            self.assertEqual(talk["title"]["zh"], title)
            self.assertEqual(talk["speakers"][0]["name"], name)
            self.assertEqual(talk["start"], time)
            self.assertTrue(talk["speakers"][0]["photo"])
            self.assertTrue(talk["abstract"])
            self.assertTrue(talk["enrichment"]["topics"])
        report = forums["E3"]["talks"][1]
        self.assertTrue(report["speakers"][0]["bio"].startswith("刘万伟，国防科技大学"))
        self.assertFalse(report.get("flags"))
        opening = next(b for d in data["days"] for b in d["blocks"]
                       if "开幕式" in b["title"]["zh"])
        self.assertEqual((opening["start"], opening["end"]), ("08:30", "12:10"))
        annual = next(b for d in data["days"] for b in d["blocks"]
                      if b["title"]["zh"] == "CCF系统软件专委会年会")
        self.assertEqual(annual["end"], "21:30")
        self.assertTrue(any("颁奖典礼" in b["title"]["zh"] for d in data["days"] for b in d["blocks"]))

    def test_october_20_programmes_renumbering_and_partial_competition_dates(self):
        data = json.loads((ROOT / "data/chinasoft2026.json").read_text())
        forums = {f["code"]: f for f in data["forums"]}
        self.assertEqual(len(forums), 66)
        for code, count, day, start, room in (
            ("R29", 5, "2026-11-08", "08:50", "三层2号多功能厅"),
            ("S4", 14, "2026-11-07", "15:20", "二层18号会议室"),
        ):
            forum = forums[code]
            self.assertEqual((len(forum["talks"]), forum["day_date"], forum["start"], forum["room"]),
                             (count, day, start, room))
            for talk in forum["talks"]:
                self.assertTrue(talk["enrichment"]["topics"])
                self.assertTrue(all(p.get("photo") for p in talk["speakers"]))
                if talk["type"] == "talk":
                    self.assertTrue(talk["abstract"])
                self.assertFalse(talk.get("flags"))
        self.assertNotIn("E7", forums)
        self.assertEqual(forums["E1"]["talks"][3]["extra"]["speaker_raw"], "彭蓉-张颖")
        self.assertFalse(forums["E3"]["talks"][1].get("flags"))
        self.assertEqual(forums["E6"]["start"], "14:10")
        self.assertIsNone(forums["E5"]["day_date"])
        self.assertTrue(any(m["code"] == "M5" and "原软件基础教育论坛" in m["title"]
                            for m in data["extra"]["other_meetings"]))
        self.assertEqual(forums["C1"]["sessions"], [
            {"date": "2026-11-07", "start": None, "end": None},
            {"date": "2026-11-08", "start": None, "end": None},
        ])
        self.assertIn("拟议日程", forums["C1"]["description"])
        self.assertIsNone(forums["C4"]["day_date"])
        self.assertIn("2026年11月6-8日", forums["C4"]["description"])
        for day in data["days"][2:]:
            entries = [e["forum_code"] for b in day["blocks"] for e in b.get("forum_entries", [])]
            self.assertEqual(entries.count("C1"), 1)
        dinner = next(b for d in data["days"] for b in d["blocks"] if b["title"]["zh"] == "大会晚餐")
        self.assertEqual(dinner["kind"], "banquet")
        report = forums["R23"]["talks"][5]
        self.assertEqual(report["title"]["zh"], "Quafu 量子计算云平台介绍")
        self.assertIn("Quafu", report["enrichment"]["summary"]["zh"])
        self.assertFalse(report.get("flags"))
        self.assertIn("执行过程与交付结果", forums["P4"]["talks"][3]["abstract"])
        self.assertEqual(forums["R13"]["room"], "三层1号会议室")

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
        for code in ("C5", "C2"):
            self.assertIsNone(forums[code]["start"])
            self.assertIsNone(forums[code]["end"])
        for forum in forums.values():
            for talk in forum["talks"]:
                if talk.get("type") == "talk":
                    self.assertTrue(talk["enrichment"]["topics"], (forum["code"], talk["title"]))
                    self.assertEqual(talk["enrichment"]["generated_by"], "ai")

    def test_multiday_sections_and_updated_report_order(self):
        forums = {f["code"]: f for f in json.loads((ROOT / "data/chinasoft2026.json").read_text())["forums"]}
        forum = forums["R2"]
        self.assertIsNone(forum["day_date"])
        self.assertEqual(forum["sessions"], [
            {"date": "2026-11-06", "start": "09:00", "end": "17:00"},
            {"date": "2026-11-07", "start": "15:20", "end": "18:30"},
        ])
        self.assertEqual([t["day_date"] for t in forum["talks"]], ["2026-11-06"] * 11 + ["2026-11-07"] * 6)
        self.assertFalse(forum["talks"][10]["speakers"])
        self.assertEqual(forum["talks"][10]["extra"]["hosts"][0]["name"], "梁广泰")
        self.assertEqual([b["day_date"] for b in forum["breaks"]], ["2026-11-06"] * 2 + ["2026-11-07"])
        self.assertEqual([len(forums[c]["talks"]) for c in ("R5", "R27", "S1")], [6, 5, 9])
        self.assertTrue(all(t.get("abstract") for c in ("R2", "R5", "R27") for t in forums[c]["talks"] if t["type"] == "talk"))
        self.assertTrue(all(not t.get("abstract") for t in forums["S1"]["talks"]))
        for index, name, clock in [(4, "康梓峰", "10:20"), (16, "孟岩", "16:50")]:
            talk = forums["R8"]["talks"][index]
            self.assertEqual(talk["speakers"][0]["name"], name)
            self.assertEqual(talk["start"], clock)
            self.assertTrue(talk["enrichment"]["topics"])

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
        self.assertTrue(all(host.get("photo") for talk in talks for host in talk["extra"]["hosts"]))
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
        for name, affiliation in (("金意儿", "华为"), ("陈驰", "华为"), ("狄鹏", "昆仑芯"), ("杨经纬", "百度"),
                                  ("金鑫", "荣耀"), ("黄冕", "小米")):
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
        for raw in ("待更新", "所有嘉宾", "论坛组委会", "论坛组委会代表", "姓名（待定） 华为"):
            with self.subTest(credit=raw):
                flags = []
                self.assertEqual(people(raw, flags), [])
                self.assertTrue(flags)

    def test_time_conflicts_are_preserved(self):
        forum = detail("academic-forum", "agentic-ai-testing")
        self.assertEqual(forum["extra"]["published_window"]["end"], "18:20")
        self.assertEqual(forum["talks"][-1]["end"], "18:30")
        self.assertTrue(forum["talks"][-1]["flags"])

    def test_october_16_profiles_and_source_renumbering(self):
        data = json.loads((ROOT / "data/chinasoft2026.json").read_text())
        forums = {f["code"]: f for f in data["forums"]}
        self.assertNotIn("C6", forums)
        self.assertEqual(forums["C2"]["title"]["zh"], "AI辅助研发创新大赛（鸿蒙杯）")
        self.assertEqual(forums["C2"]["day_date"], "2026-11-07")
        self.assertIsNone(forums["E5"]["day_date"])
        self.assertEqual(forums["E6"]["start"], "14:10")
        for code, index, name in (("I3", 3, "金鑫"), ("R22", 5, "黄冕")):
            talk = forums[code]["talks"][index]
            self.assertEqual(talk["speakers"][0]["name"], name)
            self.assertTrue(talk["abstract"])
            self.assertTrue(talk["speakers"][0]["bio"])
        self.assertFalse(forums["S7"]["talks"][0]["speakers"])
        self.assertEqual(forums["S7"]["talks"][0]["extra"]["collective_credit"], "论坛组委会代表")
        for code, index, kind in (("S7", 0, "opening"), ("R31", 7, "other"),
                                  ("S8", 0, "opening"), ("S2", 12, "other")):
            self.assertEqual(forums[code]["talks"][index]["type"], kind)
        chen_keys = [forums[code]["talks"][index]["speakers"][0]["extra"]["identity_key"]
                     for code, index in (("S2", 8), ("S6", 14))]
        self.assertEqual(len(set(chen_keys)), 2)
        li = next(p for p in forums["S2"]["chairs"] if p["name"] == "李佳")
        self.assertEqual(li["extra"]["identity_key"], "R4:李佳")
        xu = next(t for t in forums["R13"]["talks"] if any(p["name"] == "许福" for p in t["speakers"]))
        self.assertEqual(xu["speakers"][0]["affiliation_raw"], "教授 北京林业大学")
        self.assertFalse(xu.get("flags"))
        self.assertTrue(forums["R22"]["talks"][2]["flags"])

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

    def test_october_15_programmes_and_committee_are_complete(self):
        data = json.loads((ROOT / "data/chinasoft2026.json").read_text())
        forums = {f["code"]: f for f in data["forums"]}
        for code, count, breaks in (("R6", 6, 1), ("R7", 8, 1), ("R8", 18, 2), ("R11", 3, 1), ("R17", 8, 1)):
            with self.subTest(code=code):
                forum = forums[code]
                self.assertEqual(len(forum["talks"]), count)
                self.assertEqual(len(forum["breaks"]), breaks)
                self.assertFalse(forum["flags"])
                for talk in forum["talks"]:
                    if talk["type"] == "talk":
                        self.assertTrue(talk.get("abstract"))
                        self.assertTrue(talk.get("enrichment", {}).get("topics"))
        self.assertEqual([t["type"] for t in forums["R8"]["talks"] if t["title"]["zh"] == "结语"], ["other", "other"])
        self.assertEqual(len(forums["R8"]["chairs"]), 6)
        self.assertEqual(forums["R6"]["talks"][-1]["end"], "17:30")
        self.assertEqual(forums["R6"]["end"], "18:20")
        self.assertTrue(forums["R16"]["talks"])
        self.assertNotIn("source_navigation_status", forums["R16"]["extra"])
        self.assertIn("photo", forums["R17"]["talks"][0]["speakers"][0])
        committee = next(g for g in data["committees"] if g["role"]["zh"] == "程序委员会委员")
        self.assertEqual(len(committee["members"]), 195)
        self.assertEqual([p["name"] for p in committee["members"] if not p.get("affiliation_raw")],
                         [])
        for person in committee["members"]:
            if person["name"] in {"任晗", "谢筱恒", "许文强"}:
                self.assertEqual(person["affiliation_raw"], "华为有限公司")

    def test_namesakes_in_the_same_forum_keep_the_correct_reports_and_follows(self):
        data = json.loads((ROOT / "data/chinasoft2026.json").read_text())
        forums = {f["code"]: f for f in data["forums"]}
        qinghua = forums["R7"]["talks"][4]["speakers"][0]
        wuhan = forums["R7"]["talks"][6]["speakers"][0]
        self.assertEqual(qinghua["extra"]["identity_key"], "P4:李佳")
        self.assertEqual(wuhan["extra"]["identity_key"], "R4:李佳")
        self.assertIn("清华大学人工智能学院", qinghua["bio"])
        self.assertIn("武汉大学弘毅博士后", wuhan["bio"])
        self.assertNotEqual(qinghua["photo"], wuhan["photo"])
        self.assertIn("恶意挟持", forums["R7"]["talks"][4]["abstract"])
        self.assertIn("执行轨迹评估框架", forums["R7"]["talks"][6]["abstract"])
        self.assertNotIn("unmatched_profiles", forums["R7"]["extra"])


if __name__ == "__main__":
    unittest.main()
