import {fs, globby, path, tempy, ctx, $, fetch} from 'zx-extra'
import tar from 'tar'
import {parse, parseSources} from './parse.js'

$.verbose = $.env.DEBUG ? 1 : 0

export const copy = async (
  from,
  to,
  msg = 'chore: sync',
  ignoreFiles,
  cwd
) => {
  if (typeof from === 'object') return copy(from.from, from.to, from.msg, from.ignoreFiles, from.cwd)
  if (!from || !to) throw new Error('Both `from` and `to` arguments are required')

  const src = parse(from, {cwd})
  const dst = parse(to, {cwd})

  if (/[{}*,]/.test(dst.pattern)) throw new Error('`dest` must not be a glob')

  if (src.type === 'git') await gitFetch(src)

  if (dst.type === 'git') await gitFetch(dst, true)

  if (src.type === 'archive') await unpackArchive(src)

  if (dst.type === 'archive') throw new Error('archive as dest is not supported yet')

  await copydir({
    baseFrom: src.base,
    from: src.pattern,
    baseTo: dst.base,
    to: dst.pattern,
    debug: $.verbose ? console.log : () => {},
    ignoreFiles,
  })

  if (dst.type === 'git') await gitPush(dst, msg)
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

const gitPush = (dst, msg) => ctx(async ($) => {
  $.cwd = dst.base
  await $`git add .`
  try {
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
    res.body.on("error", reject)
    fileStream.on("finish", resolve)
  })

  return file
})

export const copydir = async ({
  from,
  to,
  baseFrom = process.cwd(),
  baseTo = process.cwd(),
  debug = () => {},
  ignoreFiles
}) => {
  const cp = (src, dest) => {
    debug('copy', 'from=', src, 'to=', dest)
    return fs.copy(src, dest)
  }
  const {patterns, dirs} = await parseSources(from, baseFrom)

  await globby(patterns, { cwd: baseFrom, absolute: true, ignoreFiles }).then((files) =>
    Promise.all([
      ...files.map((file) =>
        cp(file, path.resolve(baseTo, to, path.relative(baseFrom, file))),
      ),
      ...dirs.map((dir) => cp(dir, path.resolve(baseTo, to))),
    ]),
  )
}

export const ggcp = copy

export const gitGlobCopy = copy
