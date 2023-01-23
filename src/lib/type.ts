import { MultiCallResult } from '@lib/multicall'

export function isNotNullish<T>(param: T | undefined | null): param is T {
  return param != null
}

export function isSuccess<T, P, O>(param: MultiCallResult<T, P, O>): param is MultiCallResult<T, P, NonNullable<O>> {
  return param.success
}

export type TUnixTimestamp = number
