import { Adapter, Contract } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { getUnderlyingBalances } from "@lib/uniswap/v2/pair";
import { getPairsInfo } from "@lib/uniswap/v2/factory";
import { getMasterChefPoolsInfo, getMasterChefBalances } from "@lib/masterchef";
import { isNotNullish } from "@lib/type";
import { Token } from "@lib/token";
import { getLockerBalances, getStakerBalances } from "./balances";

const locker: Contract = {
  name: "locker",
  displayName: "Locker",
  chain: "ethereum",
  address: "0xa404f66b9278c4ab8428225014266b4b239bcdc7",
};
const staker: Contract = {
  name: "staker",
  displayName: "Staker tBone",
  chain: "ethereum",
  address: "0xf7a0383750fef5abace57cc4c9ff98e3790202b3",
};

const masterChef: Contract = {
  name: "masterChef",
  displayName: "MasterChef",
  chain: "ethereum",
  address: "0x94235659cf8b805b2c658f9ea2d6d6ddbb17c8d7",
};

const bone: Token = {
  chain: "ethereum",
  symbol: "BONE",
  decimals: 18,
  address: "0x9813037ee2218799597d83d4a5b6f3b6778218d9",
};

const adapter: Adapter = {
  id: "shibaswap",
  async getContracts() {
    const [pairsInfo, masterChefPoolsInfo] = await Promise.all([
      getPairsInfo({
        chain: "ethereum",
        factoryAddress: "0x115934131916C8b277DD010Ee02de363c09d037c",
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
    let balances = [];
    const lp = [];
    const farm = [];

    for (const contract of contracts) {
      if (contract.category === "lp") {
        lp.push(contract);
      } else if (contract.category === "farm") {
        farm.push(contract);
      }
    }

    let stakerBalances = await getStakerBalances(
      ctx,
      "ethereum",
      staker.address
    );

    balances = balances.concat(stakerBalances);

    let lockerBalances = await getLockerBalances(
      ctx,
      "ethereum",
      locker.address
    );

    balances = balances.concat(lockerBalances);

    let lpBalances = await getERC20BalanceOf(ctx, "ethereum", lp);
    lpBalances = await getUnderlyingBalances("ethereum", lpBalances);

    balances = balances.concat(lpBalances);

    let masterChefBalances = await getMasterChefBalances(ctx, {
      chain: "ethereum",
      masterChefAddress: masterChef.address,
      tokens: farm,
      rewardToken: bone,
    });
    masterChefBalances = await getUnderlyingBalances(
      "ethereum",
      masterChefBalances
    );

    balances = balances.concat(masterChefBalances);

    return {
      balances,
    };
  },
};

export default adapter;
