const { getBalances } = require("./balances");

const adapter = {
  chains: ["bsc"],
  name: "Valas",
  getBalances,
};

module.exports = adapter;
