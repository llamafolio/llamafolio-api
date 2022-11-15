import { BigNumber, ethers } from "ethers";
import { Chain, providers } from "@lib/providers";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import LQTYStakingAbi from "./abis/LQTYStaking.json";

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  lqtyStaking?: Contract
) {
  if (!lqtyStaking) {
    return [];
  }

  try {
    const balances: Balance[] = [];

    const provider = providers[chain];

    const LQTYStaking = new ethers.Contract(
      lqtyStaking.address,
      LQTYStakingAbi,
      provider
    );

    const [LQTYBalance, ETHBalance, LUSDBalance] = await Promise.all([
      LQTYStaking.stakes(ctx.address),
      LQTYStaking.getPendingETHGain(ctx.address),
      LQTYStaking.getPendingLUSDGain(ctx.address),
    ]);

    const amount = BigNumber.from(LQTYBalance);

    balances.push({
      chain: chain,
      category: "stake",
      address: lqtyStaking.address,
      symbol: "LQTY",
      decimals: 18,
      amount,
      underlyings: [
        {
          chain,
          address: "0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D",
          name: "LQTY",
          symbol: "LQTY",
          decimals: 18,
          amount,
        },
      ],
      rewards: [
        {
          chain,
          symbol: "LUSD",
          decimals: 18,
          address: "0x5f98805a4e8be255a32880fdec7f6728c6568ba0",
          amount: BigNumber.from(LUSDBalance),
          stable: true,
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
