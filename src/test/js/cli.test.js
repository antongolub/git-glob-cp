import * as assert from 'node:assert'
import {test, describe} from 'vitest'
import {$, tempy, path, fs} from 'zx-extra'

const cli = `${__dirname}/../../main/js/cli.js`

describe('CLI', () => {
  test('copy() abs to abs', async () => {
    const cwd = tempy.temporaryDirectory()
    await $({cwd})`node ${cli} https://registry.npmjs.org/ggcp/-/ggcp-1.5.1.tgz/**/*.js ./`

    assert.ok((!await fs.pathExists(path.resolve(cwd, 'package/package.json'))))
    assert.ok((await fs.pathExists(path.resolve(cwd, 'package/src/main/js/index.js'))))

    await fs.rm(cwd, {recursive: true})
  })
})
