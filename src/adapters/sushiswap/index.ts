import { Adapter, Contract } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { getUnderlyingBalances } from "@lib/uniswap/v2/pair";
import { getPairsInfo } from "@lib/uniswap/v2/factory";
import { getMasterChefPoolsInfo, getMasterChefBalances } from "@lib/masterchef";
import { isNotNullish } from "@lib/type";
import { Token } from "@lib/token";

const masterChef: Contract = {
  name: "masterChef",
  displayName: "MasterChef",
  chain: "ethereum",
  address: "0xc2edad668740f1aa35e4d8f227fb8e17dca888cd",
};

const sushi: Token = {
  chain: "ethereum",
  address: "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2",
  symbol: "SUSHI",
  decimals: 18,
};

const adapter: Adapter = {
  id: "sushiswap",
  async getContracts() {
    const [pairsInfo, masterChefPoolsInfo] = await Promise.all([
      getPairsInfo({
        chain: "ethereum",
        factoryAddress: "0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac",
        length: 100,
      }),

      getMasterChefPoolsInfo({
        chain: "ethereum",
        masterChefAddress: masterChef.address,
      }),
    ]);

    // retrieve master chef pools details from lpToken addresses
    const pairByAddress: { [key: string]: Contract } = {};
    for (const pair of pairsInfo) {
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

    const contracts = [
      ...pairsInfo.map((c) => ({ ...c, category: "lp" })),
      ...masterChefPools.map((c) => ({ ...c, category: "farm" })),
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

    let lpBalances = await getERC20BalanceOf(ctx, "ethereum", lp);
    lpBalances = await getUnderlyingBalances("ethereum", lpBalances);

    let masterChefBalances = await getMasterChefBalances(ctx, {
      chain: "ethereum",
      masterChefAddress: masterChef.address,
      tokens: farm,
      rewardToken: sushi,
    });
    masterChefBalances = await getUnderlyingBalances(
      "ethereum",
      masterChefBalances
    );

    const balances = lpBalances.concat(masterChefBalances);

    return {
      balances,
    };
  },
};

export default adapter;
