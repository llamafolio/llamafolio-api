export const lendingTokens = [
  {
    chain: "fantom",
    address: "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
    symbol: "FTM",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E",
    symbol: "DAI",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0x74b23882a30290451a17c44f4f05243b6b58c76d",
    symbol: "ETH",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0x38aCa5484B8603373Acc6961Ecd57a6a594510A3",
    symbol: "WBTC",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0x940F41F0ec9ba1A34CF001cc03347ac092F5F6B5",
    symbol: "fUSDT",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0xe578C856933D8e1082740bf7661e379Aa2A30b26",
    symbol: "USDC",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0x690754A168B022331cAA2467207c61919b3F8A98",
    symbol: "CRV",
    decimals: 18,
  },
  {
    chain: "fantom",
    address: "0xc664Fc7b8487a3E10824Cda768c1d239F2403bBe",
    symbol: "MIM",
    decimals: 18,
  },
];

export const gTokenByToken: { [key: string]: string } = {
  // FTM -> gFTM
  "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83":
    "0x39B3bd37208CBaDE74D0fcBDBb12D606295b430a",
  // DAI -> gDAI
  "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E":
    "0x07E6332dD090D287d3489245038daF987955DCFB",
  // ETH -> gETH
  "0x74b23882a30290451a17c44f4f05243b6b58c76d":
    "0x25c130B2624CF12A4Ea30143eF50c5D68cEFA22f",
  // WBTC -> gWBTC
  "0x38aCa5484B8603373Acc6961Ecd57a6a594510A3":
    "0x321162cd933e2be498cd2267a90534a804051b11",
  // fUSDT -> gfUSDT
  "0x940F41F0ec9ba1A34CF001cc03347ac092F5F6B5":
    "0x049d68029688eabf473097a2fc38ef61633a3c7a",
  // USDC -> gUSDC
  "0xe578C856933D8e1082740bf7661e379Aa2A30b26":
    "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
  // CRV -> gCRV
  "0x690754A168B022331cAA2467207c61919b3F8A98":
    "0x1e4f97b9f9f913c46f1632781732927b9019c68b",
  // MIM -> gMIM
  "0xc664Fc7b8487a3E10824Cda768c1d239F2403bBe":
    "0x82f0b8b456c1a451378467398982d4834b6829c1",
};
