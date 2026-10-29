"""Only idempotent publication requests may be retried automatically."""
import http.client
import unittest
from unittest.mock import patch, MagicMock

import publish_data


class PublisherTests(unittest.TestCase):
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
