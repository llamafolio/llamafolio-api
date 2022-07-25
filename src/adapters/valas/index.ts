import { getBalances as getERC20Balances } from "../../lib/erc20";

const adapter = {
  name: "Valas",
  groups: [
    {
      chain: "bsc",
      type: "Lending",
      tokens: [
        {
          address: "0xB1EbdD56729940089Ecc3aD0BBEEB12b6842ea6F",
          symbol: "VALAS",
          decimals: 18,
        },
        {
          address: "0xB11A912CD93DcffA8b609b4C021E89723ceb7FE8",
          symbol: "valBNB",
          decimals: 18,
        },
        {
          address: "0xaeD19DAB3cd68E4267aec7B2479b1eD2144Ad77f",
          symbol: "valBUSD",
          decimals: 18,
        },
        {
          address: "0xA6fDEa1655910C504E974f7F1B520B74be21857B",
          symbol: "valUSDC",
          decimals: 18,
        },
        {
          address: "0x5f7f6cB266737B89f7aF86b30F03Ae94334b83e9",
          symbol: "valUSDT",
          decimals: 18,
        },
        {
          address: "0x2c85EBAE81b7078Cd656b2C6e2d58411cB41D91A",
          symbol: "valDAI",
          decimals: 18,
        },
        {
          address: "0xC37079A50611a742A018c39ba1C5EbDd89896334",
          symbol: "valCAKE",
          decimals: 18,
        },
        {
          address: "0x831F42c8A0892C1a5b7Fa3E972B3CE3AA40D676e",
          symbol: "valETH",
          decimals: 18,
        },
        {
          address: "0x204992f7fCBC4c0455d7Fec5f712BeDd98E7d6d6",
          symbol: "valBTCB",
          decimals: 18,
        },
        {
          address: "0xBB5DDE96BAD874e4FFe000B41Fa5E98F0665a4BC",
          symbol: "valTUSD",
          decimals: 18,
        },
      ],
    },
  ],
  async getBalances(account: string) {
    const balances = await getERC20Balances(
      this.groups.flatMap((group) =>
        group.tokens.map((token) => {
          token.chain = group.chain;
          return token;
        })
      ),
      account
    );

    const balanceByToken = {};
    for (const balance of balances) {
      balanceByToken[balance.address] = balance;
    }

    return this.groups.map((group) => {
      const tokens = group.tokens.flatMap(
        (token) => balanceByToken[token.address] || []
      );
      group.tokens = tokens;
      return group;
    });
  },
};

export default adapter;
