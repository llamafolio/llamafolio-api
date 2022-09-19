import { Adapter, Contract } from "@lib/adapter";
import { getPairsBalances, getUnderlyingBalances } from "@lib/uniswap/v2/pair";
import { getPairsContracts } from "@lib/uniswap/v2/factory";
import { getMasterChefPoolsInfo, getMasterChefBalances } from "@lib/masterchef";
import { isNotNullish } from "@lib/type";
import { Token } from "@lib/token";

const masterChef: Contract = {
  name: "masterChef",
  displayName: "MasterChef",
  chain: "bsc",
  address: "0x73feaa1eE314F8c655E354234017bE2193C9E24E", //legacy masterchef
};

const masterChef2: Contract = {
  name: "masterChef",
  displayName: "MasterChef 2",
  chain: "bsc",
  address: "0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652",
};



const cake: Token = {
  chain: "bsc",
  address: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
  symbol: "CAKE",
  decimals: 18,
};

const adapter: Adapter = {
  id: "pancakeswap",
  async getContracts() {
    const [pairs, masterChefPoolsInfo, masterChefPoolsInfo2] = await Promise.all([
      getPairsContracts({
        chain: "bsc",
        factoryAddress: "0xca143ce32fe78f1f7019d7d551a6402fc5350c73",
        length: 100,
      }),

      getMasterChefPoolsInfo({
        chain: "bsc",
        masterChefAddress: masterChef.address,
      }),
      getMasterChefPoolsInfo({
        chain: "bsc",
        masterChefAddress: masterChef2.address,
      }),
    ]);

    // retrieve master chef pools details from lpToken addresses
    const pairByAddress: { [key: string]: Contract } = {};
    for (const pair of pairs) {
      pairByAddress[pair.address.toLowerCase()] = pair;
    }

    const masterChefPools = masterChefPoolsInfo
      .map((pool) => {
        const pair = pairByAddress[pool.lpToken.toLowerCase()];
        if (!pair) {
          return null;
        }
        return { ...pair, pid: pool.pid };
      })
      .filter(isNotNullish);

      const masterChefPools2 = masterChefPoolsInfo2
        .map((pool) => {
          const pair = pairByAddress[pool.lpToken.toLowerCase()];
          if (!pair) {
            return null;
          }
          return { ...pair, pid: pool.pid };
        })
        .filter(isNotNullish);

    const contracts = [
      ...pairs.map((c) => ({ ...c, category: "lp" })),
      ...masterChefPools.map((c) => ({ ...c, category: "farm" })),
      ...masterChefPools2.map((c) => ({ ...c, category: "farm" })),
    ];

    return {
      contracts,
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    const lp = [];
    const farm = [];

    for (const contract of contracts) {
      if (contract.category === "lp") {
        lp.push(contract);
      } else if (contract.category === "farm") {
        farm.push(contract);
      }
    }


    const pairs = await getPairsBalances(ctx, "bsc", lp);

    //old masterchef
    let masterChefBalances = await getMasterChefBalances(ctx, {
      chain: "bsc",
      masterChefAddress: masterChef.address,
      tokens: farm,
      rewardToken: cake,
      pendingRewardName: "pendingCake"
    });

    masterChefBalances = await getUnderlyingBalances(
      "bsc",
      masterChefBalances
    );


    //new masterchef
    let masterChefBalances2 = await getMasterChefBalances(ctx, {
      chain: "bsc",
      masterChefAddress: masterChef2.address,
      tokens: farm,
      rewardToken: cake,
      pendingRewardName: "pendingCake"
    });

    masterChefBalances2 = await getUnderlyingBalances(
      "bsc",
      masterChefBalances2
    );

    const balances = pairs.concat(masterChefBalances).concat(masterChefBalances2);

    return {
      balances,
    };
  },
};

export default adapter;
