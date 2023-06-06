export type Pretty<T> = { [K in keyof T]: T[K] } & {}

export function isNotNullish<T>(param: T | undefined | null): param is T {
  return param != null
}

export type TUnixTimestamp = number
