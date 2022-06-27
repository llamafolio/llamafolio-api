const { getBalances: getERC20Balances } = require("../../lib/erc20");

// TODO: provide CLI to get this info with an array of addresses for a given chain
const tokens = [
  {
    chain: "bsc",
    address: "0xB1EbdD56729940089Ecc3aD0BBEEB12b6842ea6F",
    name: "Valas Finance Protocol Token",
    symbol: "VALAS",
    decimals: 18,
  },
  {
    chain: "bsc",
    address: "0xB11A912CD93DcffA8b609b4C021E89723ceb7FE8",
    name: "Valas BNB",
    symbol: "valBNB",
    decimals: 18,
  },
  {
    chain: "bsc",
    address: "0xaeD19DAB3cd68E4267aec7B2479b1eD2144Ad77f",
    name: "Valas BUSD",
    symbol: "valBUSD",
    decimals: 18,
  },
  {
    chain: "bsc",
    address: "0xA6fDEa1655910C504E974f7F1B520B74be21857B",
    name: "Valas USDC",
    symbol: "valUSDC",
    decimals: 18,
  },
  {
    chain: "bsc",
    address: "0x5f7f6cB266737B89f7aF86b30F03Ae94334b83e9",
    name: "Valas USDT",
    symbol: "valUSDT",
    decimals: 18,
  },
  {
    chain: "bsc",
    address: "0x2c85EBAE81b7078Cd656b2C6e2d58411cB41D91A",
    name: "Valas DAI",
    symbol: "valDAI",
    decimals: 18,
  },
  {
    chain: "bsc",
    address: "0xC37079A50611a742A018c39ba1C5EbDd89896334",
    name: "Valas CAKE",
    symbol: "valCAKE",
    decimals: 18,
  },
  {
    chain: "bsc",
    address: "0x831F42c8A0892C1a5b7Fa3E972B3CE3AA40D676e",
    name: "Valas ETH",
    symbol: "valETH",
    decimals: 18,
  },
  {
    chain: "bsc",
    address: "0x204992f7fCBC4c0455d7Fec5f712BeDd98E7d6d6",
    name: "Valas BTCB",
    symbol: "valBTCB",
    decimals: 18,
  },
  {
    chain: "bsc",
    address: "0xBB5DDE96BAD874e4FFe000B41Fa5E98F0665a4BC",
    name: "Valas TUSD",
    symbol: "valTUSD",
    decimals: 18,
  },
];

function getBalances(account) {
  return getERC20Balances(tokens, account);
}

const contracts = [
  {
    chain: "bsc",
    address: "",
  },
];

const events = [
  {
    id: "Transfer(address,address,uint256)",
  },
];

module.exports = { getBalances, events };
