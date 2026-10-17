import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).with_name('dispatch_release_ci.py')
SPEC = importlib.util.spec_from_file_location('dispatch_release_ci', SCRIPT)
DISPATCH = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(DISPATCH)


class DispatchReleaseCiTest(unittest.TestCase):
    def test_dispatches_ci_only_for_release_please_proposals(self):
        calls = []

        def request(path, body=None):
            calls.append((path, body))
            if '/pulls/' in path:
                return {'head': {'ref': 'release-please--branches--main'}}
            return None

        DISPATCH.dispatch([{'number': 12}], 'example/module', request)
        self.assertEqual(calls, [
            ('repos/example/module/pulls/12', None),
            ('repos/example/module/actions/workflows/ci.yml/dispatches', {
                'ref': 'release-please--branches--main',
            }),
        ])

    def test_rejects_a_non_release_proposal(self):
        with self.assertRaisesRegex(ValueError, 'unexpected'):
            DISPATCH.dispatch([{'number': 12}], 'example/module',
                              lambda *_: {'head': {'ref': 'feature'}})


if __name__ == '__main__':
    unittest.main()
