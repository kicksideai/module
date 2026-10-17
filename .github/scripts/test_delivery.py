import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('delivery.py')
SPEC = importlib.util.spec_from_file_location('delivery', SCRIPT)
DELIVERY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(DELIVERY)


class PublicationTest(unittest.TestCase):
    def module(self):
        return {
            'path': '.', 'organization': 'orbit', 'module': 'tasks',
            'type': 'plugin', 'visibility': 'private',
            'embed': ['orbit.tasks:ui_fs'],
        }

    def test_dry_run_has_exact_version_and_metadata(self):
        self.assertEqual(DELIVERY.publish_command(self.module(), '0.2.1', True), [
            'wippy', 'publish', '--config', '.', '--version', '0.2.1', '--create',
            '--module-visibility', 'private', '--module-type', 'plugin',
            '--embed', 'orbit.tasks:ui_fs', '--dry-run',
        ])

    def test_real_publish_requires_token(self):
        with patch.dict(os.environ, {}, clear=True), \
                patch.object(DELIVERY, 'initialization', return_value=self.initialization()):
            with self.assertRaisesRegex(ValueError, 'WIPPY_TOKEN'):
                DELIVERY.publish_command(self.module(), '0.2.1', False)

    def test_missing_or_non_release_version_fails(self):
        for version in ['', 'latest', 'v0.2.1', '0.2']:
            with self.subTest(version=version), self.assertRaises(ValueError):
                DELIVERY.publish_command(self.module(), version, True)

    def initialization(self, initialized=True, organization='orbit', module='tasks'):
        return {
            'initialized': initialized,
            'identity': {'organization': organization, 'module': module},
        }

    def test_uninitialized_module_cannot_publish_for_any_identity(self):
        with self.assertRaisesRegex(ValueError, 'initialize'):
            DELIVERY.validate_identity(
                self.module(), self.initialization(initialized=False))

    def test_initialized_module_with_matching_identity_can_publish(self):
        DELIVERY.validate_identity(
            self.module(), self.initialization(organization='orbit', module='tasks'))

    def test_initialized_module_rejects_mismatched_release_metadata(self):
        with self.assertRaisesRegex(ValueError, 'identity'):
            DELIVERY.validate_identity(
                self.module(), self.initialization(organization='another', module='tasks'))

    def test_only_declared_module_path_can_publish(self):
        self.assertEqual(DELIVERY.released_module('.')['path'], '.')
        with self.assertRaisesRegex(ValueError, 'invalid'):
            DELIVERY.released_module('unknown')


if __name__ == '__main__':
    unittest.main()
