import {fs, globby, path, tempy, ctx, $, fetch} from 'zx-extra'
import tar from 'tar'

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

  if (dst.type === 'archive') throw new Error('archive as dest is not supported yet')

  if (src.type === 'git') await gitFetch(src)

  if (dst.type === 'git') await gitFetch(dst, true)

  if (src.type === 'archive') {
    if (src.protocol !== 'local') src.file = await download(src.file)

    if (fs.statSync(src.file).isFile()) {
      await tar.x({ file: src.file, cwd: src.base })
    }
  }

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

export const parse = (target, {cwd = process.cwd(), temp = tempy.temporaryDirectory()} = {}) => {
  const arcref = /((https?:\/\/)?.+\.(zip|tgz|xz|7z))\/(.+)$/
  const gitref = /^((git@|(?:git|ssh|https):\/\/)(?:(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*(?:[A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9](?::\d+)?)[\/:][A-Za-z0-9-]+\/[A-Za-z0-9-]+\.git)\/([a-z0-9-]+)\/(.+)$/

  if (gitref.test(target)) {
    const [, repo, protocol, branch, pattern] = gitref.exec(target)

    return {
      type: 'git',
      protocol: protocol.replaceAll(/[^a-z]/g, ''),
      repo,
      branch,
      pattern,
      base: temp,
      raw: target
    }
  }

  if (arcref.test(target)) {
    const [, file, _protocol, format, pattern] = arcref.exec(target)
    const protocol = _protocol ? _protocol.replaceAll(/[^a-z]/g, '') : 'local'

    return {
      type: 'archive',
      file: protocol !== 'local' || file.startsWith?.('/') ? file : path.resolve(cwd, file),
      protocol,
      format,
      pattern,
      raw: target,
      base: temp
    }
  }

  return {
    type: 'local',
    base: target.startsWith?.('/') ? '/' : cwd,
    pattern: target,
    raw: target,
  }
}

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

const parseSources = async (src, base) => {
  const entries = Array.isArray(src) ? src : [src]
  const patterns = []
  const dirs = []

  await Promise.all(
    entries.map(async (entry) => {
      const entryAbs = path.resolve(base, entry)

      try {
        if ((await fs.lstat(entryAbs))?.isDirectory()) {
          dirs.push(entryAbs)

          return
        }
      } catch {}

      patterns.push(entry)
    }),
  )

  return {patterns, dirs}
}

export const ggcp = copy

export const gitGlobCopy = copy
