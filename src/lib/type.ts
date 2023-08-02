export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export function isNotNullish<T>(param: T | undefined | null): param is T {
  return param != null
}

export type TUnixTimestamp = number

/**
 * `undefined, null, false, '', 0, 0n` are all falsy values
 * can be used to filter out empty values from an array (e.g., if environment variable is set to empty string)
 */
export const isNotFalsy = <T>(param: T | undefined | null | false | '' | 0 | 0n): param is T => !!param

// extract the value type from a Map
export type MapValueType<A> = A extends Map<any, infer V> ? V : never
