const { getBalances } = require("./balances");

const adapter = {
  chains: ["fantom"],
  name: "Geist",
  getBalances,
};

module.exports = adapter;
