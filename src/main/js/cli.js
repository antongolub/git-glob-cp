#!/usr/bin/env node

import {argv} from 'zx-extra'
import {copy} from './index.js'
import { createRequire } from "node:module"

if (argv.help || argv.h) {
  console.log(`
  Usage:
    ggcp <from> <to> [options]
    
  Options:
    --help -h           Show help
    --message -m        Message to commit
    --version -v        Show version
    --ignore-files -i   Path to ignore files (like .gitignore or .npmignore)

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

await copy(argv._.slice(0, -1), argv._.slice(-1)[0], argv.m || argv.message, argv.i || argv.ignoreFiles)
