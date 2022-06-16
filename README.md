# ggcp

> git-glob-copy — glob-aware two-way copying for git

[![Release](https://github.com/antongolub/git-glob-cp/workflows/CI/badge.svg)](https://github.com/antongolub/git-glob-cp/actions)
[![Maintainability](https://api.codeclimate.com/v1/badges/2995a0e9d2a84bd4191f/maintainability)](https://codeclimate.com/github/antongolub/git-glob-cp/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/2995a0e9d2a84bd4191f/test_coverage)](https://codeclimate.com/github/antongolub/git-glob-cp/test_coverage)

## Requirements
* Node.js >= 16

## Install
```shell
npm i git-glob-cp

# or as a global package
npm i -g ggcp
```

## Usage
To perform various repos automations: bulk config reading, cascade template updating, etc.

### CLI
```shell
# Copy `json` files from `master` branch of remote repo to local dir `temp`
git-glob-copy git@github.com:antongolub/tsc-esm-fix.git/master/*.json temp


# Push `json` files from local `temp` dir to remote `test` branch
git-glob-copy *.json git@github.com:antongolub/tsc-esm-fix.git/master/json


# Push from repo to repo
ggcp 'git@github.com:antongolub/tsc-esm-fix.git/master/foo/*.txt' git@github.com:antongolub/git-glob-copy.git/master/bar
```
`ggcp` is an alias for `git-glob-copy`

| Flag           | Description    | Default       |
|----------------|----------------|---------------|
| `--message -m` | Commit message | `chore: sync` |
| `--version -v` | Print version  |               |
| `--help -h`    | Show help      |               |

### Pattern examples
```js
// Absolute dir path
'/foo/bar'

// Rel paths
'./foo/bar'
'foo/bar'

// Any depth md-filter
'./**/*.md'

// git://, git@, ssh://, https:// refs
'https://github.com/antongolub/tsc-esm-fix.git/master/*.json'
'ssh://github.com/antongolub/git-glob-cp.git/test/test'
'git@github.com:antongolub/git-glob-cp.git/master/foo/bar/**/*.js'
'git://github.com/antongolub/git-glob-cp.git/some-branch-name/test/**/*.js'
// repo ref                                 // branch        // glob pattern
```

### JS API
```js
import { copy, sync } from 'ggcp'

const from = 'git@github.com:antongolub/tsc-esm-fix.git/master/*.json'
const to = 'temp'
const msg = 'updated'

// Copy any to any
await copy(from, to, msg)

// Synchronizes dirs only
await copydir({
  from,       // Relative dir / glob pattern(s)
  baseFrom,   // Base dir. Defaults to process.cwd()
  to,         // Rel path.
  baseTo,     // Base dir. Defaults to process.cwd()
  debug,      // Debugger. Defauts to noop
})
```

## License
[MIT](./LICENSE)
