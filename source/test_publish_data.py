"""Source releases replace data exactly without allowing archives to edit code."""
import io
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import publish_data


class SourceArchiveTests(unittest.TestCase):
    def archive(self, root, entries):
        path = root / 'release.tar.gz'
        with tarfile.open(path, 'w:gz') as archive:
            for name, value in entries:
                member = tarfile.TarInfo(name)
                member.size = len(value)
                archive.addfile(member, io.BytesIO(value))
        return path

    def test_restore_removes_stale_inputs_and_preserves_code(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'source/raw').mkdir(parents=True)
            (root / 'source/raw/removed.html').write_text('stale')
            (root / 'source/build.py').write_text('code')
            archive = self.archive(root, [('source/raw/new.html', b'published')])
            with patch.object(publish_data, 'ROOT', root):
                publish_data.extract_sources(archive)
            self.assertFalse((root / 'source/raw/removed.html').exists())
            self.assertEqual((root / 'source/raw/new.html').read_text(), 'published')
            self.assertEqual((root / 'source/build.py').read_text(), 'code')

    def test_rejects_entire_unsafe_archive_before_any_write(self):
        for bad in ['source/build.py', 'source/../../escape.json', '/tmp/escape.json']:
            with self.subTest(bad=bad), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                archive = self.archive(root, [('source/raw/new.json', b'{}'), (bad, b'bad')])
                with patch.object(publish_data, 'ROOT', root), self.assertRaises(ValueError):
                    publish_data.extract_sources(archive)
                self.assertFalse((root / 'source').exists())


if __name__ == '__main__':
    unittest.main()
