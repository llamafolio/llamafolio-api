export function isHex(str: string) {
  const regexp = /^0x[0-9A-F]+$/i;
  return regexp.test(str);
}

/**
 *
 * @param {string} str ex: "0xabc123"
 * @return {Buffer}
 */
export function strToBuf(str: string) {
  return Buffer.from(str.substring(2), "hex");
}

/**
 *
 * @param {Buffer} buffer
 * @return {string} ex: "0xabc123"
 */
export function bufToStr(buffer: Buffer) {
  return "0x" + buffer.toString("hex");
}
