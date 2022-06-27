const { getBalances } = require("./balances");

const adapter = {
  // TODO: all
  chains: [],
  name: "Wallet",
  getBalances,
};

module.exports = adapter;
