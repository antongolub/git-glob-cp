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
```
| Flag | Description    | Default       |
|------|----------------|---------------|
| `-m` | Commit message | `chore: sync` |

### JS API
```js
import { copy } from 'git-glob-copy'

const from = 'git@github.com:antongolub/tsc-esm-fix.git/master/*.json'
const to = 'temp'

await copy(from, to)
```

## License
[MIT](./LICENSE)
