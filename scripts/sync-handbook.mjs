#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { cpSync, lstatSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRepo = 'https://github.com/kicksideai/kickside.git'
const sourcePath = 'app/src/app/docs/kickside-development'
const destination = join(root, 'docs/kickside-development')

function usage() {
  console.log(`Usage: node scripts/sync-handbook.mjs [--check] [--ref <git-ref>]

Fetch ${sourcePath} from ${sourceRepo} at main (or the selected ref).
Without --check, replace docs/kickside-development with the fetched directory.
With --check, fail if the local directory differs.`)
}

function parseArgs(args) {
  let check = false
  let ref = 'main'
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--check') {
      check = true
    } else if (arg === '--ref') {
      ref = args[index + 1]
      if (!ref || ref.startsWith('-')) throw new Error('--ref requires a Git ref')
      index += 1
    } else if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  return { check, ref }
}

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, stdio: 'inherit', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed with exit code ${result.status}`)
}

function fetchHandbook(workspace, ref) {
  const checkout = join(workspace, 'checkout')
  git(['clone', '--depth=1', '--filter=blob:none', '--no-checkout', '--single-branch', sourceRepo, checkout], workspace)
  git(['fetch', '--depth=1', 'origin', ref], checkout)
  git(['sparse-checkout', 'init', '--no-cone'], checkout)
  git(['sparse-checkout', 'set', '--no-cone', sourcePath], checkout)
  git(['read-tree', '--reset', '-u', 'FETCH_HEAD'], checkout)
  const fetched = join(checkout, sourcePath)
  try {
    if (!lstatSync(fetched).isDirectory()) throw new Error(`Canonical handbook path is not a directory at ref ${ref}`)
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Canonical handbook path is missing at ref ${ref}: ${sourcePath}`)
    throw error
  }
  return fetched
}

function manifest(directory) {
  const result = new Map()
  function visit(current) {
    for (const name of readdirSync(current).sort()) {
      const fullPath = join(current, name)
      const path = relative(directory, fullPath).split('\\').join('/')
      const stat = lstatSync(fullPath)
      if (stat.isSymbolicLink()) {
        result.set(path, `link:${readlinkSync(fullPath)}`)
      } else if (stat.isDirectory()) {
        result.set(path, 'directory')
        visit(fullPath)
      } else if (stat.isFile()) {
        const digest = createHash('sha256').update(readFileSync(fullPath)).digest('hex')
        result.set(path, `file:${stat.mode & 0o111}:${digest}`)
      } else {
        result.set(path, 'other')
      }
    }
  }
  visit(directory)
  return result
}

function differences(expected, actual) {
  const paths = [...new Set([...expected.keys(), ...actual.keys()])].sort()
  return paths.filter((path) => expected.get(path) !== actual.get(path))
}

function main() {
  const { check, ref } = parseArgs(process.argv.slice(2))
  const workspace = mkdtempSync(join(root, '.handbook-sync-'))
  try {
    const fetched = fetchHandbook(workspace, ref)
    if (check) {
      const changed = differences(manifest(fetched), manifest(destination))
      if (changed.length > 0) {
        console.error(`Handbook copy differs from kicksideai/kickside@${ref} (${changed.length} changed path${changed.length === 1 ? '' : 's'}).`)
        for (const path of changed.slice(0, 20)) console.error(`  ${path}`)
        if (changed.length > 20) console.error(`  ... and ${changed.length - 20} more`)
        console.error('Run make sync-handbook to update the copy.')
        process.exitCode = 1
      } else {
        console.log(`Handbook copy matches kicksideai/kickside@${ref}.`)
      }
    } else {
      rmSync(destination, { recursive: true, force: true })
      cpSync(fetched, destination, { recursive: true, dereference: false, preserveTimestamps: true })
      const changed = differences(manifest(fetched), manifest(destination))
      if (changed.length > 0) throw new Error(`Handbook copy was incomplete (${changed.slice(0, 20).join(', ')})`)
      console.log(`Synced docs/kickside-development from kicksideai/kickside@${ref}.`)
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
