"""Retain reviewed pages even when official navigation withdraws their links."""
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import fetch


class RetainedPageTests(unittest.TestCase):
    def test_withdrawn_pages_survive_a_navigation_refresh(self):
        retained = "pages/agenda/competition/templates/example.html"
        responses = {
            "index.html": "<main>Current navigation</main>",
            "pages/home.html": "<p>Home</p>",
            "pages/introduction.html": "<p>Introduction</p>",
            retained: "<p>Retained competition programme</p>",
        }
        requested = []

        def urlopen(request, timeout):
            path = request.full_url.removeprefix(fetch.BASE)
            requested.append(path)
            return io.BytesIO(responses[path].encode())

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            raw = root / "raw"
            raw.mkdir()
            (root / "curation.json").write_text(json.dumps({
                "retained_details": [], "retained_pages": [retained],
            }))
            with patch.object(fetch, "RAW", raw), patch("fetch.urllib.request.urlopen", side_effect=urlopen):
                fetch.fetch()
            self.assertIn(retained, requested)
            self.assertEqual((raw / retained).read_text(), responses[retained])
