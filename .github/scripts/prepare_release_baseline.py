"""Resolve the baseline when a GitHub snapshot starts a new commit history."""
import argparse
import base64
import os
import json
from pathlib import Path
import subprocess

def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], text=True).strip()

def resolve_baseline(root, declared):
    exists = subprocess.run(['git', '-C', str(root), 'cat-file', '-e', declared + '^{commit}'], stderr=subprocess.DEVNULL).returncode
    if not exists:
        ancestor = subprocess.run(['git', '-C', str(root), 'merge-base', '--is-ancestor', declared, 'HEAD']).returncode
        if ancestor:
            raise ValueError('declared release baseline is not an ancestor')
        return declared
    snapshot = git(root, 'rev-list', '--max-parents=0', '--first-parent', 'HEAD').splitlines()
    if len(snapshot) != 1:
        raise ValueError('snapshot history requires exactly one root commit')
    git(root, 'show', snapshot[0] + ':.release-please-manifest.json')
    return snapshot[0]

def github_api(path, body=None):
    command = ['gh', 'api', path]
    if body is not None:
        command += ['--method', 'PUT', '--input', '-']
    output = subprocess.check_output(command, input=json.dumps(body).encode() if body is not None else None)
    return json.loads(output)

def prepare(root, repository=None, persist=False):
    blockers_file = root / '.github/release-blockers.json'
    if persist and blockers_file.exists():
        blockers = json.loads(blockers_file.read_text())
        if blockers:
            raise ValueError('unverified release baselines: ' + '; '.join(blockers))
    path = root / 'release-please-config.json'
    config = json.loads(path.read_text())
    declared = config['last-release-sha']
    baseline = resolve_baseline(root, declared)
    config['last-release-sha'] = baseline
    content = json.dumps(config, indent=2) + '\n'
    if persist and baseline != declared:
        if not repository:
            raise ValueError('repository is required to persist the snapshot baseline')
        branch = github_api(f'repos/{repository}')['default_branch']
        remote = github_api(f'repos/{repository}/contents/release-please-config.json?ref={branch}')
        github_api(f'repos/{repository}/contents/release-please-config.json', {
            'message': 'chore(release): seed the snapshot release baseline',
            'branch': branch, 'sha': remote['sha'],
            'content': base64.b64encode(content.encode()).decode(),
        })
    path.write_text(content)
    print('Release baseline: ' + baseline)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--persist', action='store_true')
    args = parser.parse_args()
    prepare(Path(__file__).resolve().parents[2], os.environ.get('GITHUB_REPOSITORY'), args.persist)
