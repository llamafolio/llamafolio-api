export const ADDRESS_ZERO: `0x${string}` = '0x0000000000000000000000000000000000000000'

export function isHex(string_: string): string_ is `0x${string}` {
  const regexp = /^0x[\dA-Fa-f]{40}$/
  return regexp.test(string_)
}
