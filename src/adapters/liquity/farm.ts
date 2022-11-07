import { BigNumber, ethers } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import StabilityPoolAbi from "./abis/StabilityPool.json";

export async function getFarmBalances(
  ctx: BaseContext,
  chain: Chain,
  stabilityPool?: Contract
) {
  if (!stabilityPool) {
    return [];
  }

  try {
    const balances: Balance[] = [];

    const provider = providers[chain];

    const StabilityPool = new ethers.Contract(
      stabilityPool.address,
      StabilityPoolAbi,
      provider
    );

    const [LUSDBalance, ETHBalance, LQTYBalance] = await Promise.all([
      StabilityPool.getCompoundedLUSDDeposit(ctx.address),
      StabilityPool.getDepositorETHGain(ctx.address),
      StabilityPool.getDepositorLQTYGain(ctx.address),
    ]);

    const amount = BigNumber.from(LUSDBalance);

    balances.push({
      chain: chain,
      category: "farm",
      address: stabilityPool.address,
      symbol: "LUSD",
      decimals: 18,
      amount,
      stable: true,
      underlyings: [
        {
          chain,
          address: "0x5f98805a4e8be255a32880fdec7f6728c6568ba0",
          name: "LUSD",
          symbol: "LUSD",
          decimals: 18,
          stable: true,
          amount,
        },
      ],
      rewards: [
        {
          chain,
          symbol: "LQTY",
          decimals: 18,
          address: "0x6dea81c8171d0ba574754ef6f8b412f2ed88c54d",
          amount: BigNumber.from(LQTYBalance),
        },
        {
          chain,
          symbol: "ETH",
          decimals: 18,
          address: "0x0000000000000000000000000000000000000000",
          amount: BigNumber.from(ETHBalance),
        },
      ],
    });

    return balances;
  } catch (error) {
    console.log("Failed to get farm balances", error);
    return [];
  }
}
