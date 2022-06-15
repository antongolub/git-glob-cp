# git-glob-copy
> Glob-aware two-way copying for git

## Requirements
* Node.js >= 16

## Install
```shell
npm i git-glob-copy

# or as a global package
npm i -g git-glob-copy
```

## Usage
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

### JS API
```js
import { copy } from 'git-glob-copy'

const from = 'git@github.com:antongolub/tsc-esm-fix.git/master/*.json'
const to = 'temp'
const msg = 'updated'

await copy(from, to, msg)
```

## License
[MIT](./LICENSE)
