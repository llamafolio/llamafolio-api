import { call } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { BaseContext, Contract, Balance } from "@lib/adapter";
import { abi } from "@lib/erc20";
import { BigNumber } from "ethers";
import { getUnderlyingsBalances } from "./helper";

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contract?: Contract
) {
  if (!contract || !contract.underlyings?.[0] || !contract.rewards?.[0]) {
    return [];
  }

  try {
    const balances: Balance[] = [];

    const [balanceOfRes, rewardsRes] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: abi.balanceOf,
      }),

      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: {
          inputs: [
            { internalType: "address", name: "staker", type: "address" },
          ],
          name: "getTotalRewardsBalance",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      }),
    ]);

    const amount = BigNumber.from(balanceOfRes.output);
    const rewards = BigNumber.from(rewardsRes.output);

    const balance: Balance = {
      chain,
      address: contract.address,
      decimals: contract.decimals,
      symbol: contract.symbol,
      amount,
      category: "stake",
      underlyings: [{ ...contract.underlyings?.[0], amount }],
      rewards: [{ ...contract.rewards?.[0], amount: rewards }],
    };
    balances.push(balance);

    return balances;
  } catch (error) {
    return [];
  }
}

export async function getStakeBalancerPoolBalances(
  ctx: BaseContext,
  chain: Chain,
  contract?: Contract
) {
  if (!contract || !contract.underlyings?.[0]) {
    return [];
  }

  const underlyingContract: Contract = contract.underlyings?.[0];

  if (!underlyingContract.rewards?.[0]) {
    return [];
  }

  try {
    const balances: Balance[] = [];

    const [balanceOfRes, rewardsRes] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: abi.balanceOf,
      }),

      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: {
          inputs: [
            { internalType: "address", name: "staker", type: "address" },
          ],
          name: "getTotalRewardsBalance",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      }),
    ]);

    const balanceOf = BigNumber.from(balanceOfRes.output);
    const rewards = BigNumber.from(rewardsRes.output);

    const underlyings = await getUnderlyingsBalances(
      chain,
      balanceOf,
      contract.underlyings?.[0]
    );

    const balance: Balance = {
      chain,
      address: contract.address,
      decimals: contract.decimals,
      symbol: contract.symbol,
      amount: BigNumber.from(balanceOf),
      underlyings,
      rewards: [{ ...underlyingContract.rewards?.[0], amount: rewards }],
      category: "stake",
    };
    balances.push(balance);
    return balances;
  } catch (error) {
    return [];
  }
}
