import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const workflow = await readFile(resolve(root, '.github/workflows/release.yml'), 'utf8')
const makefile = await readFile(resolve(root, 'Makefile'), 'utf8')
const ci = await readFile(resolve(root, '.github/workflows/ci.yml'), 'utf8')

assert.match(workflow, /googleapis\/release-please-action@/)
assert.match(workflow, /\.github\/scripts\/delivery\.py publish/)
assert.match(workflow, /ref: \$\{\{ env\.RELEASE_TAG \}\}/)
assert.doesNotMatch(workflow, /\bgit (?:checkout|switch)\b/)
assert.match(makefile, /Releases use GitHub Release Please \(\.github\/workflows\/release\.yml\)\./)
assert.doesNotMatch(makefile, /^publish:\s*release-check/m)
const buildIndex = ci.indexOf('- name: Build, lint and Lua module tests')
const freshnessIndex = ci.indexOf('run: git diff --exit-code -- static/')
assert.ok(buildIndex >= 0 && freshnessIndex > buildIndex,
  'CI must reject committed bundles that differ from the build output')

console.log('Release workflow owns publishing and the Makefile directs releases to it')
