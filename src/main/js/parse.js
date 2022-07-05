import {path, tempy} from 'zx-extra'

export const parse = (target, {cwd = process.cwd(), temp = tempy.temporaryDirectory(), defaultPattern} = {}) =>
  parseGitref(target, {temp, defaultPattern}) ||
  parseArchiveref(target, {temp, cwd, defaultPattern}) ||
  parseLocalref(target, {cwd})

const parseGitref = (target, {temp, defaultPattern}) => {
  const gitref = /^((git@|(?:git|ssh|https):\/\/)(?:(?:[a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*(?:[A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9](?::\d+)?)[\/:][A-Za-z0-9-]+\/[A-Za-z0-9-]+\.git)\/([a-z0-9-]+)(?:\/(.+))?$/

  if (gitref.test(target)) {
    const [, repo, protocol, branch, pattern = defaultPattern] = gitref.exec(target)

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

const parseArchiveref = (target, {temp, cwd, defaultPattern}) => {
  const arcref = /((https?:\/\/)?.+\.(zip|tgz|xz|7z))(?:\/(.+))?$/

  if (arcref.test(target)) {
    const [, file, _protocol, format, pattern = defaultPattern] = arcref.exec(target)
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
