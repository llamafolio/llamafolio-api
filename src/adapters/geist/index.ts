import { getBalances as getERC20Balances } from "../../lib/erc20";

const adapter = {
  name: "Geist",
  groups: [
    {
      chain: "fantom",
      type: "Lending",
      tokens: [
        {
          address: "0x39b3bd37208cbade74d0fcbdbb12d606295b430a",
          symbol: "gFTM",
          decimals: 18,
        },
        {
          address: "0x940f41f0ec9ba1a34cf001cc03347ac092f5f6b5",
          symbol: "gFUSDT",
          decimals: 18,
        },
        {
          address: "0x07e6332dd090d287d3489245038daf987955dcfb",
          symbol: "gDAI",
          decimals: 18,
        },
        {
          address: "0xe578c856933d8e1082740bf7661e379aa2a30b26",
          symbol: "gUSDC",
          decimals: 18,
        },
        {
          address: "0x25c130b2624cf12a4ea30143ef50c5d68cefa22f",
          symbol: "gETH",
          decimals: 18,
        },
        {
          address: "0x38aca5484b8603373acc6961ecd57a6a594510a3",
          symbol: "gWBTC",
          decimals: 18,
        },
        {
          address: "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
          symbol: "gWFTM",
          decimals: 18,
        },
        {
          address: "0x690754a168b022331caa2467207c61919b3f8a98",
          symbol: "gCRV",
          decimals: 18,
        },
        {
          address: "0xc664fc7b8487a3e10824cda768c1d239f2403bbe",
          symbol: "gMIM",
          decimals: 18,
        },
      ],
    },
  ],
  async getBalances(account) {
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
