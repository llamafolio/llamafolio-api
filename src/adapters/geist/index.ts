import { Contract } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { getERC20Fetcher, abi as erc20Abi } from "../../lib/erc20";
import MultiFeeDistributionABI from "./abis/MultiFeeDistribution.json";
import { Adapter, Fetcher } from "../../lib/adapter";

const lendingTokens = [
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

const gTokenByToken: { [key: string]: string } = {
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

// fetch the balance of a gToken
function getLendFetcher({
  token,
  symbol,
  decimals,
}: {
  token: string;
  symbol: string;
  decimals: number;
}): Fetcher {
  return {
    chain: "fantom",
    address: gTokenByToken[token],

    getCalls(context) {
      return [
        {
          chain: "fantom",
          target: gTokenByToken[token],
          params: [context.account],
          abi: erc20Abi.balanceOf,
        },
      ];
    },

    getBalances(context) {
      return [
        {
          chain: "fantom",
          address: token,
          amount: context.calls[0].output,
          symbol,
          decimals,
        },
      ];
    },
  };
}

const adapter: Adapter = {
  name: "Geist",
  groups: [
    {
      chain: "fantom",
      type: "lend",
      contracts: lendingTokens.map((token) =>
        getLendFetcher({
          token: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
        })
      ),
    },
  ],
  contracts: [
    {
      chain: "fantom",
      name: "LendingPool",
      address: "0x9FAD24f572045c7869117160A571B2e50b10d068",
      async getBalances() {
        return [];
      },
    },
    {
      chain: "fantom",
      name: "MultiFeeDistribution",
      address: "0x49c93a95dbcc9A6A4D8f77E59c038ce5020e82f8",
      async getBalances(context) {
        const balances = [];
        const provider = providers["fantom"];

        const multiFeeDistribution = new Contract(
          "0x49c93a95dbcc9A6A4D8f77E59c038ce5020e82f8",
          MultiFeeDistributionABI,
          provider
        );

        const [claimableRewards, lockedBalances] = await Promise.all([
          multiFeeDistribution.claimableRewards(context.account),
          multiFeeDistribution.lockedBalances(context.account),
        ]);

        for (const rewardData of claimableRewards) {
          balances.push({
            chain: "fantom",
            address: rewardData.token,
            balance: rewardData.amount,
          });
        }

        const lockedToken = {
          address: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
          symbol: "GEIST",
          decimals: 18,
          balance: lockedBalances.total,
          type: "Locked",
          // expired locked
          unlockable: lockedBalances.unlockable,
          locked: lockedBalances.locked,
          // lock + expiry dates:
          // [amount_0, timestamp_0, amount_1, timestamp_1, ...]
          lockData: lockedBalances.lockData,
        };
        balances.push(lockedToken);

        return balances;
      },
    },
  ],
  // // TODO: MAYBE, MAYBE an async getContracts for factories (with caching)
  // async getContracts() {
  //   return [];
  // },

  // // Problem of having a single function that returns a list of tokens is that we have to run this function
  // // no matter what, there's no way to know which contract interaction "triggered" this computation

  // // better to have a static list of contract addresses, each having a `getBalances` function to run
  // async getBalances(account: string) {
  //   const balances = await getERC20Balances(
  //     this.groups.flatMap((group) =>
  //       group.tokens.map((token) => {
  //         token.chain = group.chain;
  //         return token;
  //       })
  //     ),
  //     account
  //   );

  //   const balanceByToken = {};
  //   for (const balance of balances) {
  //     balanceByToken[balance.address] = balance;
  //   }

  //   return this.groups.map((group) => {
  //     const tokens = group.tokens.flatMap(
  //       (token) => balanceByToken[token.address] || []
  //     );
  //     group.tokens = tokens;
  //     return group;
  //   });
  // },
};

export default adapter;
