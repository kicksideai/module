// SPDX-License-Identifier: MIT
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const checker = fileURLToPath(new URL('./check-connection-secrets.mjs', import.meta.url))

function binding(name, fields, meta = {}, contract = 'kickside.connection:connection') {
  return {
    name,
    kind: 'contract.binding',
    meta: { provider: name, class: ['connection'], credential_schema: { fields }, ...meta },
    contracts: [{ contract, context_required: ['component_id'], methods: { get_status: 'example:status' } }],
  }
}

function runCheck(t, entries) {
  const source = mkdtempSync(join(tmpdir(), 'connection-secrets-test-'))
  t.after(() => rmSync(source, { recursive: true, force: true }))
  writeFileSync(join(source, '_index.yaml'), JSON.stringify({ version: '1.0', namespace: 'example', entries }))
  return spawnSync(process.execPath, [checker, source], { encoding: 'utf8' })
}

test('requires an exact declared string path for optional and conditional password fields', t => {
  const result = runCheck(t, [
    binding('login', [
      { key: 'login', type: 'text' },
      { key: 'password', type: 'password', required: true },
      { key: 'token', type: 'password', required_if: { key: 'login', equals: 'selected mode' } },
      { key: 'otp_secret', type: 'password', required: false },
    ]),
    binding('literal_key', [{ key: 'auth.password', type: 'password' }], {
      secret_fields: [{ path: ['auth', 'password'], type: 'string' }, { path: ['auth.password'], type: 'number' }],
    }),
  ])
  assert.equal(result.status, 1, result.stderr)
  assert.equal(result.stderr.trim().split('\n').length, 4, result.stderr)
  for (const key of ['password', 'token', 'otp_secret', 'auth.password']) {
    assert.ok(result.stderr.includes(`requires a string secret_fields path ${JSON.stringify([key])}`), result.stderr)
  }
})

test('accepts covered standard forms and leaves custom or unrelated bindings to their owners', t => {
  const result = runCheck(t, [
    binding('standard', [{ key: 'auth.password', type: 'password' }, { key: 'url', type: 'url' }], {
      class: 'connection',
      secret_fields: [{ path: ['auth.password'], type: 'string' }, { path: ['credentials', 'refresh'], type: 'string' }],
    }),
    binding('custom', [{ key: 'setup_token', type: 'password' }], {
      component: { create: { view: 'example:connect' } },
      secret_fields: [{ path: ['access_url'], type: 'string' }],
    }),
    binding('oauth', [{ key: 'exchange_input', type: 'password' }], {}, 'kickside.oauth:provider'),
  ])
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
})
