import importlib.util,json,subprocess,tempfile,unittest
from unittest.mock import patch
from pathlib import Path
SPEC=importlib.util.spec_from_file_location('baseline',Path(__file__).with_name('prepare_release_baseline.py'))
BASELINE=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(BASELINE)
class BaselineTest(unittest.TestCase):
 def repository(self):
  temporary=tempfile.TemporaryDirectory();self.addCleanup(temporary.cleanup); root=Path(temporary.name)
  self.git(root,'init','-b','main');self.git(root,'config','user.name','test');self.git(root,'config','user.email','test@example.com')
  (root/'release-please-config.json').write_text(json.dumps({'last-release-sha':'f'*40}))
  (root/'.release-please-manifest.json').write_text('{}')
  self.git(root,'add','.');self.git(root,'commit','-m','chore: snapshot')
  snapshot=self.git(root,'rev-parse','HEAD').strip()
  (root/'feature').write_text('new');self.git(root,'add','.');self.git(root,'commit','-m','feat: add feature')
  return root,snapshot
 def git(self,root,*args):
  return subprocess.check_output(['git','-C',str(root),*args],stderr=subprocess.DEVNULL,text=True)
 def test_missing_source_history_resolves_the_snapshot_root(self):
  root,snapshot=self.repository();self.assertEqual(BASELINE.resolve_baseline(root,'f'*40),snapshot)
 def test_present_ancestor_keeps_the_declared_baseline(self):
  root,snapshot=self.repository();self.assertEqual(BASELINE.resolve_baseline(root,snapshot),snapshot)
 def test_unrelated_known_commit_fails(self):
  root,snapshot=self.repository(); tree=self.git(root,'rev-parse','HEAD^{tree}').strip()
  unrelated=subprocess.check_output(['git','-C',str(root),'commit-tree',tree],input='unrelated\n',text=True).strip()
  with self.assertRaisesRegex(ValueError,'ancestor'): BASELINE.resolve_baseline(root,unrelated)
 def test_changed_baseline_persists_to_the_default_branch_api(self):
  root,snapshot=self.repository()
  with patch.object(BASELINE,'github_api') as api:
   api.side_effect=[{'default_branch':'main'}, {'sha':'blob-sha'}, {'commit':{'sha':'new-sha'}}]
   BASELINE.prepare(root, repository='kicksideai/example', persist=True)
  self.assertEqual(api.call_args_list[-1].args[0], 'repos/kicksideai/example/contents/release-please-config.json')
  body=api.call_args_list[-1].args[1]
  import base64
  self.assertEqual(json.loads(base64.b64decode(body['content']))['last-release-sha'],snapshot)
  self.assertEqual(body['branch'],'main')
  self.assertEqual(body['sha'],'blob-sha')
 def test_dry_run_never_writes_the_api(self):
  root,snapshot=self.repository()
  with patch.object(BASELINE,'github_api') as api:
   BASELINE.prepare(root)
  api.assert_not_called()
 def test_unchanged_baseline_never_writes_the_api(self):
  root,snapshot=self.repository()
  (root/'release-please-config.json').write_text(json.dumps({'last-release-sha':snapshot}))
  with patch.object(BASELINE,'github_api') as api:
   BASELINE.prepare(root, repository='kicksideai/example', persist=True)
  api.assert_not_called()
 def test_unverified_hub_version_blocks_production_before_api_writes(self):
  root,snapshot=self.repository()
  (root/'.github').mkdir()
  (root/'.github/release-blockers.json').write_text(json.dumps(['memory: Hub version is unverified']))
  with patch.object(BASELINE,'github_api') as api:
   with self.assertRaisesRegex(ValueError,'unverified'):
    BASELINE.prepare(root, repository='kicksideai/example', persist=True)
  api.assert_not_called()
unittest.main()
