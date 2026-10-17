"""Dispatch CI for Release Please proposals created with the workflow token."""
import json
import os
import subprocess

REPOSITORY = os.environ['GITHUB_REPOSITORY']


def gh(path, body=None):
    command = ['gh', 'api', path]
    if body is not None:
        command += ['--method', 'POST', '--input', '-']
    output = subprocess.check_output(
        command, input=json.dumps(body).encode() if body is not None else None)
    return json.loads(output) if output else None


for proposed in json.loads(os.environ.get('RELEASE_PRS') or '[]'):
    pr = gh(f'repos/{REPOSITORY}/pulls/{proposed["number"]}')
    branch = pr['head']['ref']
    if not branch.startswith('release-please--'):
        raise ValueError('unexpected release PR branch')
    gh(f'repos/{REPOSITORY}/actions/workflows/ci.yml/dispatches', {'ref': branch})
