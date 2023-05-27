export function isNotNullish<T>(param: T | undefined | null): param is T {
  return param != null
}

export type TUnixTimestamp = number
