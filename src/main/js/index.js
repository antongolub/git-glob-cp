import {fs, globby, path, tempy, ctx, $} from 'zx-extra'

$.verbose = $.env.DEBUG ? 1 : 0

export const copy = async (
  from,
  to,
  msg = 'chore: sync',
) => ctx(async ($) => {
  const _from = parse(from)
  const _to = parse(to)

  if (_to.glob) throw new Error('`dest` must not be a glob')

  if (_from.repo) await $`git clone --single-branch --branch ${_from.branch} --depth 1 ${_from.repo} ${_from.base}`
  if (_to.repo) await $`git clone --single-branch --branch ${_to.branch} --depth 1 ${_to.repo} ${_to.base}`

  await synchronize({
    baseFrom: _from.base,
    from: _from.pattern,
    baseTo: _to.base,
    to: _to.pattern,
    debug: $.verbose ? console.log : () => {},
  })

  if (_to.repo) {
    $.cwd = _to.base
    await $`git add .`
    await $`git commit -m ${msg}`
    await $.raw`git push origin HEAD:refs/heads/${_to.branch}`
  }
})

export const parse = (target, temp) => {
  let [, repo, branch, pattern] = /^((?:git(?::\/\/|@)|ssh:\/\/)(?:(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*(?:[A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9](?::\d+)?)[\/:][A-Za-z0-9-]+\/[A-Za-z0-9-]+(?:\.git)?)\/([a-z0-9-]+)\/(.+)$/.exec(target) || []

  const base = repo
    ? temp || tempy.temporaryDirectory()
    : target.startsWith('/')
      ? '/'
      : process.cwd()

  pattern = pattern || target

  return {
    base,
    repo,
    branch,
    pattern,
    glob: /[{}*,]/.test(pattern),
  }
}

const synchronize = async ({
  from,
  to,
  baseFrom,
  baseTo,
  debug = () => {},
}) => {
  const cp = (src, dest) => {
    debug('copy', 'from=', src, 'to=', dest)
    return fs.copy(src, dest)
  }
  const entries= Array.isArray(from) ? from : [from]
  const patterns = []
  const dirs = []

  await Promise.all(
    entries.map(async (entry) => {
      const entryAbs = path.resolve(baseFrom, entry)

      try {
        if ((await fs.lstat(entryAbs))?.isDirectory()) {
          dirs.push(entryAbs)

          return
        }
      } catch {}

      patterns.push(entry)
    }),
  )

  await globby(patterns, { cwd: baseFrom, absolute: true }).then((files) =>
    Promise.all([
      ...files.map((file) =>
        cp(file, path.resolve(baseTo, to, path.relative(baseFrom, file))),
      ),
      ...dirs.map((dir) => cp(dir, path.resolve(baseTo, to))),
    ]),
  )
}
