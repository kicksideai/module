const assert = require('node:assert/strict');
const { dryRun } = require('./release_dry_run.cjs');
(async () => {
  const calls = [];
  const github = {};
  const api = {
    GitHub: {create: async options => {calls.push(options); return github;}},
    Manifest: {fromManifest: async (...args) => {
      calls.push(args);
      return {
        buildPullRequests: async () => ['proposal'],
        buildReleases: async () => [],
        createPullRequests: () => {throw new Error('dry run writes a PR');},
        createReleases: () => {throw new Error('dry run writes a release');}
      };
    }}
  };
  const result = await dryRun(api, 'kicksideai/example', 'ci-bootstrap', 'token', 'snapshot-sha');
  assert.deepEqual(result, {pullRequests: ['proposal'], releases: []});
  assert.equal(calls[0].defaultBranch, 'ci-bootstrap');
  assert.equal(calls[1][0], github);
  assert.deepEqual(calls[1][4], {lastReleaseSha: 'snapshot-sha'});
  await assert.rejects(dryRun(api, 'invalid', 'main', 'token', 'sha'), /repository/);
  console.log('Release dry run preserves the snapshot baseline and performs no writes');
})().catch(error => {console.error(error); process.exitCode = 1;});
