"""Publish the initialized module after its Release Please PR is verified."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]


def plan():
    return json.loads((ROOT / '.github/modules.json').read_text())


def released_module(path):
    modules = plan()['modules']
    if path not in modules:
        raise ValueError('invalid released module path')
    return modules[path]


def initialization():
    return json.loads((ROOT / '.kickside-module.json').read_text())


def validate_identity(module, state):
    identity = state.get('identity')
    if state.get('initialized') is not True:
        raise ValueError('initialize the template before publishing')
    if not isinstance(identity, dict):
        raise ValueError('initialized template has no release identity')
    for field in ('organization', 'module'):
        if identity.get(field) != module.get(field):
            raise ValueError('release metadata does not match the initialized identity')


def publish_command(module, version, dry_run):
    if not re.fullmatch(r'\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?', version):
        raise ValueError('an explicit release version is required')
    if not dry_run:
        validate_identity(module, initialization())
        if not os.environ.get('WIPPY_TOKEN'):
            raise ValueError('WIPPY_TOKEN is required for publication')
    args = [
        'wippy', 'publish', '--config', module['path'], '--version', version,
        '--create', '--module-visibility', module['visibility'],
        '--module-type', module['type'],
    ]
    for entry in module['embed']:
        args += ['--embed', entry]
    if dry_run:
        args += ['--dry-run']
    return args


def publish(module, version, dry_run):
    subprocess.run(publish_command(module, version, True), cwd=ROOT, check=True)
    if not dry_run:
        subprocess.run(publish_command(module, version, False), cwd=ROOT, check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['publish'])
    parser.add_argument('--module', required=True)
    parser.add_argument('--version', required=True)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    publish(released_module(args.module), args.version, args.dry_run)
