const { getBalances } = require("./balances");

const adapter = {
  chains: ["bsc"],
  name: "PancakeSwap",
  getBalances,
};

module.exports = adapter;
