"""Require a merged Release Please PR with successful CI before publication."""
import json
import os
import subprocess

repo = os.environ['GITHUB_REPOSITORY']
sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
def gh(path):
    return json.loads(subprocess.check_output(['gh', 'api', path], text=True))
prs = gh(f'repos/{repo}/commits/{sha}/pulls')
release_prs = [pr for pr in prs if pr['merged_at'] and pr['head']['ref'].startswith('release-please--')]
if len(release_prs) != 1:
    raise ValueError('publication requires one merged Release Please PR at the release tag')
pr = release_prs[0]
runs = gh(f'repos/{repo}/actions/runs?head_sha={pr["head"]["sha"]}&per_page=100')['workflow_runs']
ci = [run for run in runs if run['path'] == '.github/workflows/ci.yml' and run['event'] in ('pull_request', 'workflow_dispatch')]
if not ci or max(ci, key=lambda run: run['id'])['conclusion'] != 'success':
    raise ValueError('the release PR requires successful CI on its final commit')
print(f'Release PR #{pr["number"]} has successful CI')
