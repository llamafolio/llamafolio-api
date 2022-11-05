import { Chain } from "@defillama/sdk/build/general";
import { BaseContext, Balance, Contract } from "@lib/adapter";
import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers";

export async function getLendingRewardsBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[],
  lendingPoolContract?: Contract
) {
  if (!lendingPoolContract || !lendingPoolContract.rewards?.[0]) {
    return [];
  }

  try {
    const assetsAddressesList: any = contracts
      .filter((contract) => contract.category === "lend")
      .map((contract) => contract.address);

    const rewards: Balance[] = [];

    const userRewardsRes = await call({
      chain,
      target: lendingPoolContract.rewards?.[0].address,
      params: [assetsAddressesList, ctx.address],
      abi: {
        inputs: [
          { internalType: "address[]", name: "assets", type: "address[]" },
          { internalType: "address", name: "user", type: "address" },
        ],
        name: "getRewardsBalance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    });

    const userRewards = BigNumber.from(userRewardsRes.output);

    const lendingPoolContractRewards: Contract =
      lendingPoolContract.rewards?.[0];
    const underlyings = lendingPoolContractRewards.underlyings?.[0];

    if (underlyings) {
      const reward: Balance = {
        chain: underlyings.chain,
        address: underlyings.address,
        decimals: underlyings.decimals,
        symbol: underlyings.symbol,
        amount: userRewards,
        category: "reward",
      };
      rewards.push(reward);
    }

    return rewards;
  } catch (error) {
    return []
  }
}
