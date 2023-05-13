declare function copy(
  from: string | string[],
  to: string,
  msg?: string,
  ignoreFiles?: string | string[],
  cwd?: string
): Promise<void>

declare function copy(opts: {
  from: string | string[],
  to: string,
  msg?: string,
  ignoreFiles?: string | string[],
  cwd?: string
}): Promise<void>
