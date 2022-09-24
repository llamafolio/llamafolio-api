import { Chain, providers } from "@defillama/sdk/build/general";
import { Adapter, Balance } from "@lib/adapter";
import { getERC20BalanceOf, getERC20Details } from "@lib/erc20";
import { multicall } from "@lib/multicall";
import { BigNumber, ethers } from "ethers";
import farmingAbi from "./abis/farmingTruefi.json";

const lendingPool = [
  "0x1Ed460D149D48FA7d91703bf4890F97220C09437", // Truefi BUSD pool
  "0xA991356d261fbaF194463aF6DF8f0464F8f1c742", // Truefi USDC pool
  "0x6002b1dcB26E7B1AA797A17551C6F487923299d7", // Truefi USDT pool
  "0x97cE06c3e3D027715b2d6C22e67D5096000072E5", // Truefi TUSD pool
  "0xa1e72267084192Db7387c8CC1328fadE470e4149", // Legacy TUSD pool
];

const farmingAdress = "0xec6c3FD795D6e6f202825Ddb56E01b3c128b0b10"; // Liquidity Gauche multifarm

const getFamingInfos = async (ctx, chain) => {
  const farmingInfos = [];

  const provider = providers[chain];
  const farmingContracts = new ethers.Contract(
    farmingAdress,
    farmingAbi,
    provider
  );

  for (let i = 0; i < lendingPool.length; i++) {
    const details = {
      chain,
      decimals: 18,
      address: lendingPool[i],
      claimable: await farmingContracts.claimable(lendingPool[i], ctx.address),
      amount: await farmingContracts.staked(lendingPool[i], ctx.address),
    };
    farmingInfos.push(details);
  }
  return farmingInfos;
};

const getLendingInfos = async (
  chain: Chain,
  tokens: string[]
): Promise<Balance[]> => {
  let lendingPoolInfos = [];
  let lendingPoolDetails = await getERC20Details(chain, tokens);

  const calls = tokens.map((address) => ({
    target: address,
    params: [],
  }));

  const [poolValue, totalSupply] = await Promise.all([
    multicall({
      chain,
      calls: calls,
      abi: {
        inputs: [],
        name: "poolValue",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),
    multicall({
      chain,
      calls,
      abi: {
        inputs: [],
        name: "totalSupply",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  for (let i = 0; i < tokens.length; i++) {
    const details = {
      ...lendingPoolDetails[i],
      chain,
      address: tokens[i],
      poolValue: poolValue[i].output,
      totalSupply: totalSupply[i].output,
      APY: BigNumber.from(poolValue[i].output).div(totalSupply[i].output),
    };
    lendingPoolInfos.push(details);
  }
  return lendingPoolInfos;
};

const adapter: Adapter = {
  id: "truefi",
  async getContracts() {
    const stakeTRU = await getLendingInfos("ethereum", lendingPool);
    return {
      contracts: [...stakeTRU],
    };
  },
  async getBalances(ctx, contracts) {
    let lendingBalances = (
      await getERC20BalanceOf(ctx, "ethereum", contracts)
    ).map((item) => {
      return {
        ...item,
        category: "stake",
        amount: BigNumber.from(item.amount).mul(item.APY),
      };
    });

    let farmingBalance = (await getFamingInfos(ctx, "ethereum")).map((item) => {
      return {
        ...item,
        category: "farm",
      };
    });
    let balances = [...lendingBalances,...farmingBalance]
    console.log(balances)

    return {
      balances,
    };
  },
};

export default adapter;
