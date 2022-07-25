const { getBalances: getERC20Balances } = require("../../lib/erc20");

// TODO: ?
const __tokens = {
  fantom: [
    {
      address: "0x39b3bd37208cbade74d0fcbdbb12d606295b430a",
      name: "gFTM",
      symbol: "gFTM",
      decimals: 18,
    },
  ],
};

const tokens = [
  {
    chain: "fantom",
    address: "0x39b3bd37208cbade74d0fcbdbb12d606295b430a",
    name: "gFTM",
    symbol: "gFTM",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0x940f41f0ec9ba1a34cf001cc03347ac092f5f6b5",
    name: "gFUSDT",
    symbol: "gFUSDT",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0x07e6332dd090d287d3489245038daf987955dcfb",
    name: "gDAI",
    symbol: "gDAI",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0xe578c856933d8e1082740bf7661e379aa2a30b26",
    name: "gUSDC",
    symbol: "gUSDC",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0x25c130b2624cf12a4ea30143ef50c5d68cefa22f",
    name: "gETH",
    symbol: "gETH",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0x38aca5484b8603373acc6961ecd57a6a594510a3",
    name: "gWBTC",
    symbol: "gWBTC",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
    name: "gWFTM",
    symbol: "gWFTM",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0x690754a168b022331caa2467207c61919b3f8a98",
    name: "gCRV",
    symbol: "gCRV",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0xc664fc7b8487a3e10824cda768c1d239f2403bbe",
    name: "gMIM",
    symbol: "gMIM",
    decimals: 18,
    // if specified, use it, otherwise fetch it with our endpoint ?
    // balance: ??
    // if specified, use it, otherwise fetch it with our endpoint ?
    // price: ??
  },
];

// an adapter must specify the tokens involved, an optional way to get the balance and an optional way to get the price ?

function getTokens() {
  return tokens;
}

function getBalances(account) {
  return getERC20Balances(tokens, account);
}

module.exports = { getBalances };
