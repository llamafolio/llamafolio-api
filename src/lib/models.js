/**
 *
 * @param {string} str ex: "0xabc123"
 * @return {Buffer}
 */
function strToBuf(str) {
  return Buffer.from(str.substring(2), "hex");
}

/**
 *
 * @param {Buffer} buffer
 * @return {string} ex: "0xabc123"
 */
function bufToStr(buffer) {
  return "0x" + buffer.toString("hex");
}

function parseTransaction(transaction) {
  return {
    ...transaction,
    from_address: bufToStr(transaction.from_address),
    to_address: bufToStr(transaction.to_address),
    hash: bufToStr(transaction.hash),
  };
}

module.exports = {
  strToBuf,
  bufToStr,
  parseTransaction,
};
