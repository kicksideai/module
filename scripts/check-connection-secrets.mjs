// SPDX-License-Identifier: MIT
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const connectionContract = 'kickside.connection:connection'

function passwordKeys(meta) {
  const classes = typeof meta.class === 'string' ? [meta.class] : meta.class
  const customView = meta.component?.create?.view
  const fields = meta.credential_schema?.fields
  if (typeof meta.provider !== 'string' || !meta.provider || !Array.isArray(classes)
    || !classes.includes('connection') || (typeof customView === 'string' && customView)
    || !Array.isArray(fields)) return []

  return fields.filter(field => field?.type === 'password' && typeof field.key === 'string' && field.key)
    .map(field => field.key)
}

function check(source) {
  if (!statSync(source).isDirectory()) throw new Error('source must be a directory')
  const scratch = mkdtempSync(join(tmpdir(), 'connection-secrets-'))
  const lock = ['--lock-file', 'wippy.lock']
  const runWippy = args => {
    try {
      return execFileSync('wippy', args, { cwd: scratch, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      throw new Error(`wippy ${args.slice(0, args[0] === 'registry' ? 2 : 1).join(' ')} failed (${error.code ?? error.status})`)
    }
  }

  try {
    // A source-only lock lets Wippy resolve the owning module's entries without installing dependencies or starting the app.
    runWippy(['init', ...lock, '--src-dir', source, '--modules-dir', join(scratch, 'modules')])
    const entries = JSON.parse(runWippy(['registry', 'list', ...lock, '--kind', 'contract.binding', '--json']))
    const failures = []
    for (const { id, meta = {} } of entries) {
      const keys = passwordKeys(meta)
      if (!keys.length) continue

      const contracts = JSON.parse(runWippy(['registry', 'show', id, ...lock, '--field', 'contracts', '--json']))
      if (!Array.isArray(contracts) || !contracts.some(contract => contract?.contract === connectionContract)) continue

      const declared = new Set((Array.isArray(meta.secret_fields) ? meta.secret_fields : [])
        .filter(field => field?.type === 'string' && Array.isArray(field.path) && field.path.length === 1)
        .map(field => field.path[0]))
      for (const key of new Set(keys)) {
        if (!declared.has(key)) failures.push(`${id} password field ${JSON.stringify(key)} requires a string secret_fields path ${JSON.stringify([key])}`)
      }
    }
    return failures
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

try {
  if (process.argv.length > 3) throw new Error('usage: node check-connection-secrets.mjs [source-directory]')
  for (const failure of check(resolve(process.argv[2] ?? 'src'))) {
    console.error(`check-connection-secrets: ${failure}`)
    process.exitCode = 1
  }
} catch (error) {
  console.error(`check-connection-secrets: ${error.message}`)
  process.exitCode = 1
}
