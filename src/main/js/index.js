import {fs, tempy, ctx, $, fetch, copy as _copy} from 'zx-extra'
import tar from 'tar'
import {parse} from './parse.js'

$.verbose = $.env.DEBUG ? 1 : 0

export const copy = async (
  from,
  to,
  msg = 'chore: sync',
  ignoreFiles,
  cwd
) => {
  const { src, dst } = parseArgs(from, to, msg, ignoreFiles, cwd)

  if (dst.type === 'archive') throw new Error('archive as dest is not supported yet')

  if (src.type === 'archive') await unpackArchive(src)

  if (src.type === 'git') await gitFetch(src)

  if (dst.type === 'git') await gitFetch(dst, true)

  await _copy({
    baseFrom: src.base,
    from: src.pattern,
    baseTo: dst.base,
    to: dst.pattern,
    debug: $.verbose ? console.log : () => {},
    ignoreFiles,
  })

  if (dst.type === 'git') await gitPush(dst, msg)
}

const parseArgs = (
  from,
  to,
  msg = 'chore: sync',
  ignoreFiles,
  cwd
) => {
  if (typeof from === 'object' && !Array.isArray(from) && from !== null) return parseArgs(from.from, from.to, from.msg, from.ignoreFiles, from.cwd)

  if (!from || !to) throw new Error('Both `from` and `to` arguments are required')

  const src = parse(from, {cwd, defaultPattern: '**/*'})
  const dst = parse(to, {cwd, defaultPattern: '.'})

  if (/[{}*,]/.test(dst.pattern)) throw new Error('`dest` must not be a glob')

  return {src, dst, msg}
}

const unpackArchive = async (src) => {
  if (src.protocol !== 'local') src.file = await download(src.file)

  if (fs.statSync(src.file).isFile()) await tar.x({ file: src.file, cwd: src.base })
}

const gitFetch = (src, nothrow) => ctx(async ($) => {
  $.cwd = src.base
  try {
    await $`git clone --single-branch --branch ${src.branch} --depth 1 ${src.repo} .`
  } catch (e) {
    if (!nothrow) throw (e)
    console.warn(`ref ${src.branch} does not exist in ${src.repo}`)
    await $`git init`
    await $`git remote add origin ${src.repo}`
  }
})

const getGitConfig = async (name, cwd) => (await $.o({nothrow: true, cwd})`git config ${name}`).stdout.trim()

const gitPush = (dst, msg) => ctx(async ($) => {
  $.cwd = dst.base
  const gitCommitterEmail = $.env.GIT_COMMITTER_EMAIL || await getGitConfig('user.email', $.cwd) || 'semrel-extra-bot@hotmail.com'
  const gitCommitterName = $.env.GIT_COMMITTER_NAME || await getGitConfig('user.name', $.cwd) || 'Semrel Extra Bot'

  try {
    await $`git config user.name ${gitCommitterName}`
    await $`git config user.email ${gitCommitterEmail}`
    await $`git add .`
    await $`git commit -m ${msg}`

  } catch {
    console.warn(`no changes to commit to ${dst.raw}`)
    return
  }

  await $.raw`git push origin HEAD:refs/heads/${dst.branch}`
})

export const download = (async (url, file = tempy.temporaryFile()) => {
  const res = await fetch(url)
  const fileStream = fs.createWriteStream(file)
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream)
    res.body.on('error', reject)
    fileStream.on('finish', resolve)
  })

  return file
})

export const ggcp = copy

export const gitGlobCopy = copy
