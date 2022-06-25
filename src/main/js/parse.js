import {fs, path, tempy} from 'zx-extra'

export const parseSources = async (src, base) => {
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

export const parse = (target, {cwd = process.cwd(), temp = tempy.temporaryDirectory()} = {}) =>
  parseGitref(target, {temp}) ||
  parseArchiveref(target, {temp, cwd}) ||
  parseLocalref(target, {cwd})

const parseGitref = (target, {temp}) => {
  const gitref = /^((git@|(?:git|ssh|https):\/\/)(?:(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*(?:[A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9](?::\d+)?)[\/:][A-Za-z0-9-]+\/[A-Za-z0-9-]+\.git)\/([a-z0-9-]+)(?:\/(.+))?$/

  if (gitref.test(target)) {
    const [, repo, protocol, branch, pattern = '**/*'] = gitref.exec(target)

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
}

const parseArchiveref = (target, {temp, cwd}) => {
  const arcref = /((https?:\/\/)?.+\.(zip|tgz|xz|7z))(?:\/(.+))?$/

  if (arcref.test(target)) {
    const [, file, _protocol, format, pattern = '**/*'] = arcref.exec(target)
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
}

const parseLocalref = (target, {cwd}) => ({
  type: 'local',
  base: target.startsWith?.('/') ? '/' : cwd,
  pattern: target,
  raw: target
})
