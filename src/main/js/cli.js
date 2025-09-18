#!/usr/bin/env node

import { argv as _args } from 'zx-extra'
import { copy } from './index.js'
import { createRequire } from 'node:module'

const camelize = s => s.replace(/-./g, x => x[1].toUpperCase())
const normalizeFlags = (flags = {}) => Object.entries(flags).reduce((acc, [k, v]) => ({...acc, [camelize(k)]: v}), {})
const argv = normalizeFlags(_args)

if (argv.help || argv.h) {
  console.log(`
  Usage:
    ggcp <from> <to> [options]
    
  Options:
    --message -m        Message to commit
    --ignore-files -i   Path to ignore files (like .gitignore or .npmignore)
    --cwd -C            Working directory. Defaults to process.cwd()
    --help -h           Show help
    --version -v        Show version

  Examples:
    ggcp ./*.md git@github.com:antongolub/git-glob-cp.git/test/test -m 'chore: sync'
    ggcp git@github.com:antongolub/git-glob-cp.git/master/*.md temp
    ggcp 'git@github.com:antongolub/git-glob-cp.git/master/*.md' git@github.com:antongolub/git-glob-cp.git/test/test -m 'test'
    ggcp 'https://registry.npmjs.org/ggcp/-/ggcp-1.5.1.tgz/**/*.js' /private/tmp/ggcp-1.5.1/
`)
  process.exit(0)
}

if (argv.v || argv.version) {
  console.log(createRequire(import.meta.url)('../../../package.json').version)
  process.exit(0)
}

await copy({
  from:         argv._[0],
  to:           argv._[1],
  msg:          argv.m || argv.message,
  cwd:          argv.C || argv.cwd,
  ignoreFiles:  argv.i || argv.ignoreFiles
}).then(
  () => process.exit(0),
  err => {
    console.error(err)
    process.exit(1)
  }
)
