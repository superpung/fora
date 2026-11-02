"""Only idempotent publication requests may be retried automatically."""
import http.client
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import publish_data


class PublisherTests(unittest.TestCase):
    def test_staging_preserves_reviewed_data(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "data").mkdir()
            record = root / "data" / "fixture.json"
            record.write_text('{"reviewed": true}')

            def run(command, **kwargs):
                if Path(command[1]).name == "build_all.py":
                    record.write_text('{"reparsed": true}')

            with patch.dict(publish_data.os.environ, {"FORA_MAINTENANCE_ROOT": directory}), \
                    patch.object(publish_data, "ROOT", root), \
                    patch.object(publish_data.subprocess, "check_output", return_value="revision"), \
                    patch.object(publish_data.subprocess, "run", side_effect=run) as invoked, \
                    patch.object(publish_data, "request", side_effect=RuntimeError("stop before upload")), \
                    self.assertRaisesRegex(RuntimeError, "stop before upload"):
                publish_data.stage("https://example.test", "secret", "Reviewed changes")
            self.assertEqual(record.read_text(), '{"reviewed": true}')
            validation = invoked.call_args_list[0].args[0]
            self.assertEqual(Path(validation[1]).name, "validate.py")
            self.assertEqual(validation[2], str(root / "data"))

    def test_retries_upload_but_never_repeats_promotion(self):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{}'
        with patch.object(publish_data.urllib.request, 'urlopen', side_effect=[http.client.RemoteDisconnected(), response]) as opened, \
                patch.object(publish_data.time, 'sleep'):
            publish_data.request('https://example.test', 'objects/test', 'secret', 'PUT', b'data')
            self.assertEqual(opened.call_count, 2)
        with patch.object(publish_data.urllib.request, 'urlopen', side_effect=http.client.RemoteDisconnected()) as opened, \
                self.assertRaises(http.client.RemoteDisconnected):
            publish_data.request('https://example.test', 'promote', 'secret', 'POST', b'{}')
        self.assertEqual(opened.call_count, 1)


if __name__ == '__main__':
    unittest.main()
