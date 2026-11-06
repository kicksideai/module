import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { initialize } from './init-module.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// The initializer can only be exercised from the pristine template: an
// initialized checkout no longer contains the acme/starter placeholders the
// test rewrites. Module checkouts skip this suite; the template repo's CI
// still runs it on every change.
const rootConfig = JSON.parse(await readFile(resolve(root, '.kickside-module.json'), 'utf8'))
if (rootConfig.initialized) {
  console.log('Initializer test skipped: checkout is already initialized; the suite runs in the template repository CI.')
  process.exit(0)
}

const target = await mkdtemp(resolve(tmpdir(), 'kickside-module-init-'))

await cp(root, target, {
  recursive: true,
  filter: (source) => !['.git', '.wippy', '.local', 'node_modules'].some((name) => source.split(/[\\/]/).includes(name)),
})

const args = [
  '--organization', 'orbit', '--module', 'tasks', '--title', 'Orbit Tasks',
  '--namespace', 'orbit.work.tasks', '--tag', 'orbit-tasks', '--route', 'tasks',
  '--github-owner', 'orbit-dev']
await initialize(args, target)

const config = JSON.parse(await readFile(resolve(target, '.kickside-module.json'), 'utf8'))
if (!config.initialized || config.identity.namespace !== 'orbit.work.tasks') throw new Error('initializer did not record the requested identity')
await readFile(resolve(target, 'ui/src/app/tasks.vue'), 'utf8')
const manifest = await readFile(resolve(target, 'wippy.yaml'), 'utf8')
const index = await readFile(resolve(target, 'src/_index.yaml'), 'utf8')
if (!manifest.includes('organization: orbit') || !manifest.includes('module: tasks')) throw new Error('initializer did not update package identity')
if (!index.includes('namespace: orbit.work.tasks') || !index.includes('tag_name: orbit-tasks')) throw new Error('initializer did not update registry identity')
for (const token of ['acme/starter', 'acme.starter', 'acme-starter', 'acme_starter', 'ACME_STARTER', 'AcmeStarter']) {
  if (manifest.includes(token) || index.includes(token)) throw new Error(`initializer retained ${token}`)
}
const second = await initialize(args, target)
if (!second.alreadyInitialized || second.changedFiles !== 0) throw new Error('initializer is not idempotent')
await import(`${pathToFileURL(resolve(target, 'scripts/check-module.mjs')).href}?initialized-test=1`)

const packagePath = resolve(target, 'ui/package.json')
const originalPackage = await readFile(packagePath, 'utf8')
const editedPackage = JSON.parse(originalPackage)
editedPackage.wippy.description += ' Updated module description.'
await writeFile(packagePath, `${JSON.stringify(editedPackage, null, 2)}\n`)
const staleCheck = spawnSync(process.execPath, ['scripts/check-module.mjs'], { cwd: target, encoding: 'utf8' })
assert.equal(staleCheck.status, 1, 'check must reject stale bundle metadata')
assert.match(staleCheck.stderr, /static\/wippy-meta\.json is stale/)

const verify = execFileSync('make', ['--dry-run', 'verify'], { cwd: target, encoding: 'utf8' })
const buildIndex = verify.indexOf('npm --prefix ui run build')
const checkIndex = verify.indexOf('node scripts/check-module.mjs')
assert.ok(buildIndex >= 0 && checkIndex > buildIndex, 'verify must build before checking bundle freshness')
await writeFile(packagePath, originalPackage)

// Each case edits the initialized copy, runs the checker, and restores the
// edited files before the next case.
async function checkWith(edits) {
  const originals = new Map()
  for (const [relativePath, edit] of Object.entries(edits)) {
    const path = resolve(target, relativePath)
    const original = await readFile(path, 'utf8')
    originals.set(path, original)
    await writeFile(path, edit(original))
  }
  try {
    return spawnSync(process.execPath, ['scripts/check-module.mjs'], { cwd: target, encoding: 'utf8' })
  } finally {
    for (const [path, original] of originals) await writeFile(path, original)
  }
}
const declarePrimeVue = (source) => {
  const manifest = JSON.parse(source)
  manifest.dependencies.primevue = '^4.0.0'
  return `${JSON.stringify(manifest, null, 2)}\n`
}

const declaredPrimeVue = await checkWith({ 'ui/package.json': declarePrimeVue })
assert.equal(declaredPrimeVue.status, 0, `check must accept a module that declares PrimeVue:\n${declaredPrimeVue.stderr}`)

const externalPrimeVue = await checkWith({
  'ui/package.json': declarePrimeVue,
  'static/index.js': (source) => `import { default as Tabs } from "primevue/tabs";\n${source}`,
})
assert.equal(externalPrimeVue.status, 0, `check must accept a bundle that imports a mapped PrimeVue path:\n${externalPrimeVue.stderr}`)

const unmappedImport = await checkWith({
  'static/index.js': (source) => `import { spinner } from"@primevue/icons/spinner";\n${source}`,
})
assert.equal(unmappedImport.status, 1, 'check must reject a bare import the Host import map lacks')
assert.match(unmappedImport.stderr, /static[\\/]index\.js imports @primevue\/icons\/spinner/)

const curatedExternals = await checkWith({
  'ui/vite.config.ts': (source) => source.replace('Object.keys(hostImportMap.imports)', "['vue']"),
})
assert.equal(curatedExternals.status, 1, 'check must reject externals that do not come from the Host import map')
assert.match(curatedExternals.stderr, /must come from the pinned Host import map/)

const droppedFactory = await checkWith({
  'ui/vite.config.ts': (source) => source.replace("preserveEntrySignatures: 'strict'", 'preserveEntrySignatures: false'),
})
assert.equal(droppedFactory.status, 1, 'check must reject a build that can drop webComponent() from the entry')
assert.match(droppedFactory.stderr, /keep registration and webComponent\(\) in the entry/)

const sharedWrapper = await checkWith({
  'ui/vite.config.ts': (source) => source.replace('        manualChunks: wcRuntimeChunk,\n', ''),
})
assert.equal(sharedWrapper.status, 1, 'check must reject a build that leaves the wrapper in the entry')
assert.match(sharedWrapper.stderr, /keep the wrapper in its own chunk/)

console.log('Initializer test passed')
await rm(target, { recursive: true, force: true })
