import { Buffer } from 'node:buffer'

export function isHex(string_: string): boolean {
  const regexp = /^0x[\dA-Fa-f]{40}$/
  return regexp.test(string_)
}

export const isAddress = isHex

/**
 *
 * @param str ex: "0xabc123"
 */
export function strToBuf(str: string) {
  return Buffer.from(str.substring(2), 'hex')
}

/**
 *
 * @param  buffer
 * @return ex: "0xabc123"
 */
export function bufToStr(buffer: Buffer) {
  return '0x' + buffer.toString('hex')
}
