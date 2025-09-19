import { pipeline, Readable } from 'node:stream'
import { promisify } from 'node:util'
import { fs, path, tempy, $ as _$, fetch, copy as _copy } from 'zx-extra'
import * as tar from 'tar'
import { parse } from './parse.js'

export const copy = async (opts = {}, ...rest) => {
  // Legacy support for old signature
  if (typeof opts === 'string' || Array.isArray(opts)) {
    const [to, msg, ignoreFiles, cwd] = rest
    return copy({ from: opts, to, msg, ignoreFiles, cwd })
  }

  const { from, to, msg = 'chore: sync', ignoreFiles, cwd} = opts
  if (!from || !to) throw new Error('Both `from` and `to` arguments are required')

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
    debug: _$.env.DEBUG ? console.log : () => {},
    ignoreFiles,
  })

  if (dst.type === 'git') await gitPush(dst, msg)
}

const parseArgs = (
  from,
  to,
  msg = 'chore: sync',
  ignoreFiles,
  _cwd
) => {
  const cwd = path.resolve(process.cwd(), _cwd || '.')
  const src = parse(from, {cwd, defaultPattern: '**/*'})
  const dst = parse(to, {cwd, defaultPattern: '.'})

  if (/[{}*,!]/.test(dst.pattern)) throw new Error('`dest` must not be a glob')

  return {src, dst, msg}
}

const unpackArchive = async (src) => {
  if (src.protocol !== 'local') src.file = await download(src.file)

  if (fs.statSync(src.file).isFile()) await tar.x({ file: src.file, cwd: src.base })
}

const gitFetch = async (src, nothrow) => {
  const $ = _$({
    cwd: src.base,
    verbose: !!_$.env.DEBUG,
  })

  try {
    await $`git clone --single-branch --branch ${src.branch} --depth 1 ${src.repo} .`
  } catch (e) {
    if (!nothrow) throw (e)
    console.warn(`ref ${src.branch} does not exist in ${src.repo}`)
    await $`git init`
    await $`git remote add origin ${src.repo}`
  }
}

const getGitConfig = async (name, cwd) => (await _$({nothrow: true, cwd})`git config ${name}`).stdout.trim()

const gitPush = async (dst, msg) => {
  const cwd = dst.base
  const $ = _$({
    cwd,
    verbose: !!_$.env.DEBUG,
  })

  const gitCommitterEmail = _$.env.GIT_COMMITTER_EMAIL || await getGitConfig('user.email', cwd) || 'semrel-extra-bot@hotmail.com'
  const gitCommitterName = _$.env.GIT_COMMITTER_NAME || await getGitConfig('user.name', cwd) || 'Semrel Extra Bot'

  try {
    await $`git config user.name ${gitCommitterName}`
    await $`git config user.email ${gitCommitterEmail}`
    await $`git add .`
    await $`git commit -m ${msg}`

  } catch {
    console.warn(`no changes to commit to ${dst.raw}`)
    return
  }

  await $`git push origin HEAD:refs/heads/${dst.branch}`
}

export const download = async (url, file = tempy.temporaryFile()) => {
  const res = await fetch(url)

  if (!res.ok)
    throw new Error(`Failed to fetch ${url}: ${res.statusText}`)

  const streamPipeline = promisify(pipeline)
  const fileStream = fs.createWriteStream(file)
  const body =
    typeof res.body.pipe === 'function'
      ? res.body
      : Readable.fromWeb(res.body)

  await streamPipeline(body, fileStream)

  return file
}

export const ggcp = copy

export const gitGlobCopy = copy
