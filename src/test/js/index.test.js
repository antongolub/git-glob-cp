import {suite} from 'uvu'
import * as assert from 'uvu/assert'
import {ctx, tempy} from 'zx-extra'
import {copy, parse} from '../../main/js/index.js'

const test = suite('index')

test('copy() abs to abs', () => ctx(async ($) => {
  const from = tempy.temporaryDirectory()
  const to = tempy.temporaryDirectory()

  await $.raw`echo 'foo' > ${from}/foo.txt`
  await copy(from, to)

  assert.is((await $`cat ${to}/foo.txt`).toString().trim(), 'foo')
}))

test('copy() local pattern to local', () => ctx(async ($) => {
  const from = 'temp/a/*.txt'
  const to = 'temp/b'

  await $`mkdir -p temp/a`
  await $.raw`echo 'foo' > ${$.cwd}/temp/a/foo.txt`
  await $.raw`echo 'bar' > ${$.cwd}/temp/a/bar.txt`
  await $.raw`echo 'baz' > ${$.cwd}/temp/a/baz.js`
  await copy(from, to)

  assert.is((await $`cat ${$.cwd}/temp/b/temp/a/foo.txt`).toString().trim(), 'foo')
  try {
    await $`cat ${$.cwd}/temp/b/temp/a/baz.js`
    assert.fail()
  } catch (e) {
    assert.match(e.message, /No such file or directory/)
  }

  await $`rm -r temp`
}))

test('copy() from remote git to local', () => ctx(async ($) => {
  const from = 'https://github.com/antongolub/tsc-esm-fix.git/master/*.json'
  const to = 'temp'

  await copy(from, to)

  assert.is(JSON.parse((await $`cat ${$.cwd}/temp/package.json`).toString().trim()).name, 'tsc-esm-fix')
  assert.is(JSON.parse((await $`cat ${$.cwd}/temp/typedoc.json`).toString().trim()).name, 'tsc-esm-fix')

  await $`rm -r temp`
}))

test('parse()', () => {
  const cases = [
    [
      './foo/bar',
      {
        base: process.cwd(),
        pattern: './foo/bar',
        glob: false,
        repo: undefined,
        branch: undefined
      }
    ],
    [
      './foo/bar/**/*.js',
      {
        base: process.cwd(),
        pattern: './foo/bar/**/*.js',
        glob: true,
        repo: undefined,
        branch: undefined
      }
    ],
    [
      'git@github.com:antongolub/git-glob-cp.git/master/foo/bar/**/*.js',
      {
        base: '<temp>',
        pattern: 'foo/bar/**/*.js',
        glob: true,
        repo: 'git@github.com:antongolub/git-glob-cp.git',
        branch: 'master'
      }
    ],
    [
      'https://github.com/antongolub/tsc-esm-fix.git/master/*.json',
      {
        base: '<temp>',
        pattern: '*.json',
        glob: true,
        repo: 'https://github.com/antongolub/tsc-esm-fix.git',
        branch: 'master'
      }
    ],
    [
      'git@github.com:antongolub/git-glob-cp.git/test/test',
      {
        base: '<temp>',
        pattern: 'test',
        glob: false,
        repo: 'git@github.com:antongolub/git-glob-cp.git',
        branch: 'test'
      }
    ]
  ]

  cases.forEach(([input, expected]) => {
    assert.equal(parse(input, '<temp>'), expected)
  })
})

test.run()
