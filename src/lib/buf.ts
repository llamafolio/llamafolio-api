export function isHex(str: string): boolean {
  const regexp = /^0x[0-9A-F]+$/i
  return regexp.test(str)
}

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
