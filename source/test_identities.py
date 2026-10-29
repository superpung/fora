"""Persistent IDs must survive insertions, reordering and reviewed edits."""
import copy
import unittest
from identities import assign, context, signature


class IdentitiesTest(unittest.TestCase):
    def setUp(self):
        self.a = {"title": {"zh": "Alpha"}, "speakers": [{"name": "Alex"}], "type": "talk"}
        self.b = {"title": {"zh": "Beta"}, "speakers": [{"name": "Sam"}], "type": "talk"}
        self.registry = {"reports": [
            {"id": "R1#0", "scope": "R1", "selectors": [signature(self.a)]},
            {"id": "R1#1", "scope": "R1", "selectors": [signature(self.b)]},
        ]}

    def test_reorder_does_not_reassign_identity(self):
        used = set()
        for talk in [self.b, self.a]:
            assign(talk, "R1", self.registry, used)
        self.assertEqual(self.b["id"], "R1#1")
        self.assertEqual(self.a["id"], "R1#0")

    def test_unreviewed_insert_fails(self):
        with self.assertRaisesRegex(ValueError, "Unresolved"):
            assign({"title": {"zh": "New report"}}, "R1", self.registry, set())

    def test_reviewed_title_change_retains_identity(self):
        changed = copy.deepcopy(self.a)
        changed["title"]["zh"] = "Revised title"
        self.registry["reports"][0]["selectors"].append(signature(changed))
        assign(changed, "R1", self.registry, set())
        self.assertEqual(changed["id"], "R1#0")

    def test_ambiguous_source_requires_context(self):
        entry = copy.deepcopy(self.registry["reports"][0])
        entry.update(id="R1#2", context={"date": None, "start": "11:00", "end": None})
        self.registry["reports"].append(entry)
        with self.assertRaisesRegex(ValueError, "Unresolved"):
            assign(self.a, "R1", self.registry, set())
        self.a["start"] = "11:00"
        assign(self.a, "R1", self.registry, set())
        self.assertEqual(self.a["id"], "R1#2")

    def test_same_report_cannot_receive_one_id_twice(self):
        used = set()
        assign(self.a, "R1", self.registry, used)
        with self.assertRaisesRegex(ValueError, "Unresolved"):
            assign(copy.deepcopy(self.a), "R1", self.registry, used)


if __name__ == "__main__":
    unittest.main()
