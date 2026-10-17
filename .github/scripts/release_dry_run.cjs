const fs = require('node:fs');
async function dryRun(api, repository, branch, token, baseline) {
  const parts = repository.split('/');
  if (parts.length !== 2 || parts.some(part => !part)) throw new Error('repository must be owner/name');
  const github = await api.GitHub.create({owner: parts[0], repo: parts[1], defaultBranch: branch, token});
  const manifest = await api.Manifest.fromManifest(github, branch, 'release-please-config.json',
    '.release-please-manifest.json', {lastReleaseSha: baseline});
  return {pullRequests: await manifest.buildPullRequests(), releases: await manifest.buildReleases()};
}
module.exports = {dryRun};
if (require.main === module) {
  const config = JSON.parse(fs.readFileSync('release-please-config.json', 'utf8'));
  dryRun(require('release-please'), process.env.GITHUB_REPOSITORY, process.env.GITHUB_REF_NAME,
    process.env.GH_TOKEN, config['last-release-sha'])
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => {console.error(error); process.exitCode = 1;});
}
