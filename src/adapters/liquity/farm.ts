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

    balances.push({
      chain: chain,
      category: "farm",
      symbol: "LUSD",
      decimals: 18,
      address: stabilityPool.address,
      amount: BigNumber.from(LUSDBalance),
      rewards: [
        {
          chain,
          symbol: "LQTY",
          decimals: 18,
          address: "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0",
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
