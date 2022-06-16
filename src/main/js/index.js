import {fs, globby, path, tempy, ctx, $} from 'zx-extra'

$.verbose = $.env.DEBUG ? 1 : 0

export const copy = async (
  from,
  to,
  msg = 'chore: sync',
) => {
  if (!from || !to) throw new Error('Both `from` and `to` arguments are required')

  const src = parse(from)
  const dst = parse(to)

  if (dst.glob) throw new Error('`dest` must not be a glob')

  if (src.repo) await fetch(src)

  if (dst.repo) await fetch(dst, true)

  await copydir({
    baseFrom: src.base,
    from: src.pattern,
    baseTo: dst.base,
    to: dst.pattern,
    debug: $.verbose ? console.log : () => {},
  })

  if (dst.repo) await push(dst, msg)
}

const fetch = (src, nothrow) => ctx(async ($) => {
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

const push = (dst, msg) => ctx(async ($) => {
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

export const parse = (target, temp) => {
  let [, repo, branch, pattern] = /^((?:git(?::\/\/|@)|(?:ssh|https):\/\/)(?:(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*(?:[A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9](?::\d+)?)[\/:][A-Za-z0-9-]+\/[A-Za-z0-9-]+\.git)\/([a-z0-9-]+)\/(.+)$/.exec(target) || []

  const base = repo
    ? temp || tempy.temporaryDirectory()
    : target.startsWith?.('/')
      ? '/'
      : process.cwd()

  pattern = pattern || target

  return {
    base,
    repo,
    branch,
    pattern,
    glob: /[{}*,]/.test(pattern),
    raw: target,
  }
}

export const copydir = async ({
  from,
  to,
  baseFrom = process.cwd(),
  baseTo = process.cwd(),
  debug = () => {},
}) => {
  const cp = (src, dest) => {
    debug('copy', 'from=', src, 'to=', dest)
    return fs.copy(src, dest)
  }
  const {patterns, dirs} = await parseSources(from, baseFrom)

  await globby(patterns, { cwd: baseFrom, absolute: true }).then((files) =>
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
