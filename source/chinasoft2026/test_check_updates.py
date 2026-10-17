"""Exercise update history, source errors and isolation from curated data offline."""
import contextlib
import io
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error

spec = importlib.util.spec_from_file_location("chinasoft_update_checker", Path(__file__).with_name("check_updates.py"))
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class UpdateCheckTests(unittest.TestCase):
    def test_only_active_routing_handlers_are_followed(self):
        html = """<!-- <a onclick="loadPage('stale')">Old</a> -->
        <a onclick="loadPage('home')">Home</a>
        <a onclick="loadIntroPage('committee-program')">Committee</a>
        <a onclick="loadAgenda('academic-forum', 'new')">Forum</a>"""
        self.assertEqual(checker.links(html), {
            "pages/home.html", "pages/intro/committee-program.html",
            "pages/agenda/academic-forum/templates/new.html"})
        with self.assertRaises(ValueError):
            checker.links('<a onclick="loadPage(\'../../outside\')">Invalid</a>')

    def test_same_url_replacement_and_broken_reference_recovery(self):
        old = {"same": {"sha256": "old"}, "gone": {"sha256": "x"},
               "repaired": {"status": 404}}
        new = {"same": {"sha256": "new", "status": 200},
               "repaired": {"sha256": "ok", "status": 200}, "added": {"status": 404}}
        self.assertEqual(checker.compare(old, new), {
            "added": ["added"], "removed": ["gone"],
            "changed": ["repaired", "same"], "unchanged_count": 0})

    def test_only_confirmed_missing_responses_can_be_recorded(self):
        url = checker.BASE + "missing.jpg"
        for code in (404, 410, 500):
            error = urllib.error.HTTPError(url, code, "error", {}, None)
            with self.subTest(code=code), patch.object(checker.urllib.request, "urlopen", side_effect=error):
                if code in (404, 410):
                    self.assertEqual(checker.request(url, "image/", True)[1]["status"], code)
                else:
                    with self.assertRaises(urllib.error.HTTPError):
                        checker.request(url, "image/", True)
                with self.assertRaises(urllib.error.HTTPError):
                    checker.request(url, "image/")

    def test_history_keeps_pending_imports_withdrawn_pages_and_source_errors(self):
        with tempfile.TemporaryDirectory() as temp:
            here = Path(temp)
            raw = here / "raw"
            (raw / "pages").mkdir(parents=True)
            original = b"<p>Curated biography without role</p>"
            (raw / "index.html").write_bytes(original)
            (raw / "pages/withdrawn.html").write_bytes(b"old forum")
            checker.dump(raw / "portraits.json", {})
            root = here / "checks"
            live = b'<div class="speaker-member"><img src="photo.jpg"></div><p>Original role</p>'
            def request(url, expected_type, allow_missing=False):
                if url.endswith("photo.jpg"):
                    return b"", {"url": url, "status": 404}
                body = live if url.endswith("index.html") else b"<p>Source</p>"
                return body, {"url": url, "status": 200, "sha256": checker.digest(body)}
            with patch.object(checker, "HERE", here), patch.object(checker, "request", side_effect=request), \
                    patch.object(checker.subprocess, "check_output", return_value="revision\n"), \
                    contextlib.redirect_stdout(io.StringIO()):
                first = checker.check(root)
                second = checker.check(root)
                report = json.loads((second / "report.json").read_text())
                self.assertEqual(report["baseline"], first.name)
                self.assertEqual(report["since_previous_check"]["pages"]["changed"], [])
                self.assertEqual(report["versus_curated_input"]["pages"]["changed"], ["index.html"])
                self.assertIn(checker.BASE + "photo.jpg", report["broken_portraits"])
                self.assertEqual(report["withdrawn_pages"]["pages/withdrawn.html"]["status"], 200)
                manifest = json.loads((second / "manifest.json").read_text())
                archived = checker.read_archive(second, manifest)
                self.assertEqual(archived["index.html"], live)
                self.assertIn("withdrawn/pages/withdrawn.html", archived)
                self.assertEqual((raw / "index.html").read_bytes(), original)
                with patch.object(checker, "request", side_effect=TimeoutError("offline")):
                    with self.assertRaises(TimeoutError):
                        checker.check(root)
                self.assertEqual(checker.previous_snapshot(root)[1], second)
                (second / "html.tar.gz").write_bytes(b"corrupted")
                with self.assertRaisesRegex(ValueError, "hash mismatch"):
                    checker.read_archive(second, manifest)


if __name__ == "__main__":
    unittest.main()
