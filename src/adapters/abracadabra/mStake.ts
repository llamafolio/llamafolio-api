import { BigNumber } from "ethers";
import { getERC20Details } from "@lib/erc20";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";

export async function getMStakeContract(chain: Chain, contract?: Contract) {
  const contracts: Contract[] = [];

  if (!contract) {
    return [];
  }

  try {
    const [underlyingTokenAddressRes, rewardTokenAddressRes] =
      await Promise.all([
        call({
          chain,
          target: contract.address,
          params: [],
          abi: {
            inputs: [],
            name: "spell",
            outputs: [
              { internalType: "contract ERC20", name: "", type: "address" },
            ],
            stateMutability: "view",
            type: "function",
          },
        }),

        call({
          chain,
          target: contract.address,
          params: [],
          abi: {
            inputs: [],
            name: "mim",
            outputs: [
              { internalType: "contract ERC20", name: "", type: "address" },
            ],
            stateMutability: "view",
            type: "function",
          },
        }),
      ]);

    const [underlyings, rewards] = await Promise.all([
      getERC20Details(chain, [underlyingTokenAddressRes.output]),
      getERC20Details(chain, [rewardTokenAddressRes.output]),
    ]);

    const stakeContract: Contract = {
      ...contract,
      underlyings,
      rewards,
    };
    contracts.push(stakeContract);

    return contracts;
  } catch (error) {
    return [];
  }
}

export async function getMStakeBalance(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = [];
  const contract = contracts[0];

  try {
    const [balanceOfRes, pendingRewardsRes] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: {
          inputs: [{ internalType: "address", name: "", type: "address" }],
          name: "userInfo",
          outputs: [
            { internalType: "uint128", name: "amount", type: "uint128" },
            { internalType: "uint128", name: "rewardDebt", type: "uint128" },
            { internalType: "uint128", name: "lastAdded", type: "uint128" },
          ],
          stateMutability: "view",
          type: "function",
        },
      }),

      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: {
          inputs: [{ internalType: "address", name: "_user", type: "address" }],
          name: "pendingReward",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      }),
    ]);

    const balanceOf = BigNumber.from(balanceOfRes.output.amount);
    const pendingRewards = BigNumber.from(pendingRewardsRes.output);

    if (contract && contract.underlyings?.[0] && contract.rewards?.[0]) {
      const balance: Balance = {
        ...contract,
        amount: balanceOf,
        underlyings: [{ ...contract.underlyings?.[0], amount: balanceOf }],
        rewards: [{ ...contract.rewards?.[0], amount: pendingRewards }],
        category: "stake",
      };

      balances.push(balance);
    }
    return balances;
  } catch (error) {
    return [];
  }
}
