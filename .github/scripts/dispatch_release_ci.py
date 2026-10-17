"""Dispatch CI for Release Please proposals created with the workflow token."""
import json
import os
import subprocess

def gh(path, body=None):
    command = ['gh', 'api', path]
    if body is not None:
        command += ['--method', 'POST', '--input', '-']
    output = subprocess.check_output(
        command, input=json.dumps(body).encode() if body is not None else None)
    return json.loads(output) if output else None


def dispatch(proposals, repository, request=gh):
    for proposed in proposals:
        pr = request(f'repos/{repository}/pulls/{proposed["number"]}')
        branch = pr['head']['ref']
        if not branch.startswith('release-please--'):
            raise ValueError('unexpected release PR branch')
        request(f'repos/{repository}/actions/workflows/ci.yml/dispatches', {'ref': branch})


if __name__ == '__main__':
    dispatch(json.loads(os.environ.get('RELEASE_PRS') or '[]'), os.environ['GITHUB_REPOSITORY'])
