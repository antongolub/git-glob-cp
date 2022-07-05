import {suite} from 'uvu'
import * as assert from 'uvu/assert'
import {ctx, tempy, path, fs} from 'zx-extra'
import {copy} from '../../main/js/index.js'
import {parse} from '../../main/js/parse.js'
import tar from 'tar'

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

test('copy() from git to git', () => ctx(async ($) => {
  const from = 'https://github.com/antongolub/tsc-esm-fix.git/master/*.json'
  const to = 'https://antongolub.com/fake/repo.git/test'

  try {
    await copy(from, to)
  } catch (e) {
    assert.is(e.stderr.trim(), `fatal: repository 'https://antongolub.com/fake/repo.git/' not found`)
  }
}))

test('copy() throws err on invalid args', () => ctx(async ($) => {
  try {
    await copy()
    assert.fail()
  } catch (e) {
    assert.match(e.message, 'Both `from` and `to` arguments are required')
  }
}))

test('copy() from local archive', () => ctx(async ($) => {
  const temp = tempy.temporaryDirectory()
  await fs.outputFile(path.resolve(temp, 'foo.txt'), 'foo')
  await fs.outputFile(path.resolve(temp, 'foo.js'), 'foo')
  await tar.c({
    file: path.resolve(temp, 'foo.tgz'),
    cwd: temp,
  }, ['foo.txt', 'foo.js'])

  await copy({
    from: 'foo.tgz/*.js',
    to: 'unpacked/',
    cwd: temp
  })
  assert.ok((!await fs.pathExists(path.resolve(temp, 'unpacked/foo.txt'))))
  assert.ok(await fs.pathExists(path.resolve(temp, 'unpacked/foo.js')))
  assert.is((await fs.readFile(path.resolve(temp, 'unpacked/foo.js'))).toString('utf8'), 'foo')
}))

test('copy() fails if dst is a pattern', async () => {
  try {
    await copy({
      from: 'temp/a/*.txt',
      to: 'temp/b/*.txt'
    })
    assert.fail()
  } catch (e) {
    assert.match(e.message, '`dest` must not be a glob')
  }
})

test('copy() fails if dst is an archive', async () => {
  try {
    await copy({
      from: 'temp/a/*.txt',
      to: 'temp/b/foo.tgz'
    })
    assert.fail()
  } catch (e) {
    assert.match(e.message, 'archive as dest is not supported yet')
  }
})

test('copy() from remote archive', () => ctx(async ($) => {
  const temp = tempy.temporaryDirectory()

  await copy({
    from: 'https://registry.npmjs.org/ggcp/-/ggcp-1.5.1.tgz/**/*.js',
    to: './',
    cwd: temp
  })

  assert.ok((!await fs.pathExists(path.resolve(temp, 'package/package.json'))))
  assert.ok((await fs.pathExists(path.resolve(temp, 'package/src/main/js/index.js'))))
}))

test('parse()', () => {
  const cases = [
    [
      './foo/bar',
      {
        base: process.cwd(),
        pattern: './foo/bar',
        raw: './foo/bar',
        type: 'local'
      }
    ],
    [
      './foo/bar/**/*.js',
      {
        base: process.cwd(),
        pattern: './foo/bar/**/*.js',
        raw: './foo/bar/**/*.js',
        type: 'local'
      }
    ],
    [
      'git@github.com:antongolub/git-glob-cp.git/master/foo/bar/**/*.js',
      {
        base: '<temp>',
        pattern: 'foo/bar/**/*.js',
        repo: 'git@github.com:antongolub/git-glob-cp.git',
        branch: 'master',
        raw: 'git@github.com:antongolub/git-glob-cp.git/master/foo/bar/**/*.js',
        type: 'git',
        protocol: 'git'
      }
    ],
    [
      'https://github.com/antongolub/tsc-esm-fix.git/master/*.json',
      {
        base: '<temp>',
        pattern: '*.json',
        repo: 'https://github.com/antongolub/tsc-esm-fix.git',
        branch: 'master',
        raw: 'https://github.com/antongolub/tsc-esm-fix.git/master/*.json',
        type: 'git',
        protocol: 'https'
      }
    ],
    [
      'git@github.com:antongolub/git-glob-cp.git/test/test',
      {
        base: '<temp>',
        pattern: 'test',
        repo: 'git@github.com:antongolub/git-glob-cp.git',
        branch: 'test',
        raw: 'git@github.com:antongolub/git-glob-cp.git/test/test',
        type: 'git',
        protocol: 'git'
      }
    ],
    [
      'git://github.com/antongolub/git-glob-cp.git/test/test',
      {
        base: '<temp>',
        pattern: 'test',
        repo: 'git://github.com/antongolub/git-glob-cp.git',
        branch: 'test',
        raw: 'git://github.com/antongolub/git-glob-cp.git/test/test',
        type: 'git',
        protocol: 'git'
      }
    ],
    [
      'ssh://github.com/antongolub/git-glob-cp.git/test/test',
      {
        base: '<temp>',
        pattern: 'test',
        repo: 'ssh://github.com/antongolub/git-glob-cp.git',
        branch: 'test',
        raw: 'ssh://github.com/antongolub/git-glob-cp.git/test/test',
        type: 'git',
        protocol: 'ssh'
      }
    ],
    [
      'https://github.com/archive.zip/foo/bar/**/*.js',
      {
        base: '<temp>',
        pattern: 'foo/bar/**/*.js',
        raw: 'https://github.com/archive.zip/foo/bar/**/*.js',
        file: 'https://github.com/archive.zip',
        type: 'archive',
        protocol: 'https',
        format: 'zip'
      }
    ],
    [
      '/archive.tgz/foo/bar/**/*.js',
      {
        base: '<temp>',
        pattern: 'foo/bar/**/*.js',
        raw: '/archive.tgz/foo/bar/**/*.js',
        file: '/archive.tgz',
        type: 'archive',
        protocol: 'local',
        format: 'tgz'
      }
    ],
    [
      '/archive.tgz',
      {
        base: '<temp>',
        pattern: undefined,
        raw: '/archive.tgz',
        file: '/archive.tgz',
        type: 'archive',
        protocol: 'local',
        format: 'tgz'
      }
    ]
  ]

  cases.forEach(([input, expected]) => {
    assert.equal(parse(input, {temp: '<temp>'}), expected)
  })
})

test.run()
