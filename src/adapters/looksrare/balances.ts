import { Chain } from "@defillama/sdk/build/general";
import { BaseContext, Contract } from "@lib/adapter";
import { BigNumber } from "ethers";
import { call } from "@defillama/sdk/build/abi";
import { Balance } from "@lib/adapter";

const stakingContract = "0xbcd7254a1d759efa08ec7c3291b2e85c5dcc12ce";
const compoundContract = "0x3ab16af1315dc6c95f83cbf522fecf98d00fd9ba";

export const getStakedBalances = async (
  ctx: BaseContext,
  chain: Chain,
  contract: Contract
) => {
  const balance: Balance[] = [];
  const [rewardsBalanceOfRes, stakeBalanceOfRes, yieldBalancesOfRes] =
    await Promise.all([
      call({
        chain,
        target: stakingContract,
        params: ctx.address,
        abi: {
          inputs: [{ internalType: "address", name: "user", type: "address" }],
          name: "calculatePendingRewards",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      }),

      call({
        chain,
        target: stakingContract,
        params: ctx.address,
        abi: {
          inputs: [{ internalType: "address", name: "user", type: "address" }],
          name: "calculateSharesValueInLOOKS",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      }),

      call({
        chain,
        target: compoundContract,
        params: [ctx.address],
        abi: {
          inputs: [{ internalType: "address", name: "user", type: "address" }],
          name: "calculateSharesValueInLOOKS",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      }),
    ]);

  const stakeBalanceOf = BigNumber.from(stakeBalanceOfRes.output);
  const rewardsBalanceOf = BigNumber.from(rewardsBalanceOfRes.output);
  const yieldBalanceOf = BigNumber.from(yieldBalancesOfRes.output);

  const stakebalance = {
    ...contract,
    amount: stakeBalanceOf,
    rewards: [{ ...contract.underlying, amount: rewardsBalanceOf }],
    category: "stake",
  };
  balance.push(stakebalance);

  const yieldBalance = {
    ...contract,
    amount: yieldBalanceOf,
    yieldsAddress: compoundContract,
    category: "yield",
  };
  balance.push(yieldBalance);

  return balance;
};
