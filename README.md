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


# Push `json` files from local `.` dir to remote `json` branch
git-glob-copy *.json git@github.com:antongolub/tsc-esm-fix.git/master/json


# Push from repo to repo
ggcp 'git@github.com:antongolub/tsc-esm-fix.git/master/foo/*.txt' git@github.com:antongolub/git-glob-copy.git/master/bar


# Fetch remote archive to local dir
ggcp 'https://registry.npmjs.org/ggcp/-/ggcp-1.5.1.tgz/**/*.js' /private/tmp/ggcp-1.5.1/
```
`ggcp` is an alias for `git-glob-copy`

| Flag                | Description                                        | Default         |
|---------------------|----------------------------------------------------|-----------------|
| `--message -m`      | Commit message                                     | `chore: sync`   |
| `--version -v`      | Print version                                      |                 |
| `--help -h`         | Show help                                          |                 |
| `--ignore-files -i` | Path to ignoreFile (like .gitignore or .npmignore) |                 |
| `--cwd -C`          | Working directory                                  | `process.cwd()` |

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

'https://registry.npmjs.org/ggcp/-/ggcp-1.5.1.tgz/**/*.js'
// archive ref                                   // glob pattern
```

### JS API
```js
import { copy, sync } from 'ggcp'

const from = 'git@github.com:antongolub/tsc-esm-fix.git/master/*.json'
const to = 'temp'
const msg = 'updated'
const ignoreFiles = '.gitignore'

// Copy any to any
await copy(from, to, msg, ignoreFiles)
await copy({from, to, msg, ignoreFiles}) // opts-based syntax

// Synchronizes dirs only
await copydir({
  from,       // Relative dir / glob pattern(s)
  baseFrom,   // Base dir. Defaults to process.cwd()
  to,         // Rel path.
  baseTo,     // Base dir. Defaults to process.cwd()
  debug,      // Debugger. Defauts to noop
  ignoreFiles // Glob patterns to look for ignore files. string | string[]
})
```

### GitHub Actions
For example, push `lcov.info` from the `coverage` dir into the `/<commit-sha>` dir of the `coverage` branch of the remote repo.

```yaml
  - name: Store coverage
    run: |
      npm_config_yes=true npx ggcp lcov.info https://${{ secrets.GH_TOKEN }}@github.com/${{ github.repository }}.git/coverage/${{ github.sha }} --cwd=${{ github.workspace }}/coverage --message='chore: push coverage'
```

## References
* [antongolub/globby-cp](https://github.com/antongolub/globby-cp)
* [abelnation/globcp](https://github.com/abelnation/globcp#readme)
* [ufologist/copy-push](https://github.com/ufologist/copy-push#readme)
* [npm/git](https://github.com/npm/git)

## License
[MIT](./LICENSE)
