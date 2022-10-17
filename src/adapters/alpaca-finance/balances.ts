import { multicall } from "@lib/multicall";
import { Balance, Contract, BaseContext } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { BigNumber } from "ethers/lib/ethers";

const FairLaunch: Contract = {
  name: "fairlaunchContractAddress",
  chain: "bsc",
  address: "0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F",
};

const Alpaca: Contract = {
  chain: "bsc",
  address: "0x8f0528ce5ef7b51152a59745befdd91d97091d2f",
  decimals: 18,
  symbols: "ALPACA",
};

export async function getFarmBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = [];
  const calls = contracts.map((contract) => ({
    target: FairLaunch.address,
    params: [contract.associatedWithPoolNumber, ctx.address],
  }));

  const [userInfoRes, pendingRewardsRes] = await Promise.all([
    multicall({
      chain,
      calls,
      abi: {
        inputs: [
          { internalType: "uint256", name: "", type: "uint256" },
          { internalType: "address", name: "", type: "address" },
        ],
        name: "userInfo",
        outputs: [
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "uint256", name: "rewardDebt", type: "uint256" },
          { internalType: "uint256", name: "bonusDebt", type: "uint256" },
          { internalType: "address", name: "fundedBy", type: "address" },
        ],
        stateMutability: "view",
        type: "function",
      },
    }),

    multicall({
      chain,
      calls,
      abi: {
        inputs: [
          { internalType: "uint256", name: "_pid", type: "uint256" },
          { internalType: "address", name: "_user", type: "address" },
        ],
        name: "pendingAlpaca",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  for (let i = 0; i < contracts.length; i++) {
    if (userInfoRes[i].success && pendingRewardsRes[i].success) {
      const pendingRewards = BigNumber.from(pendingRewardsRes[i].output);

      // division by 0
      if (contracts[i].totalSupply.gt(0)) {
        const amount = BigNumber.from(userInfoRes[i].output.amount)
          .mul(contracts[i].totalToken)
          .div(contracts[i].totalSupply);

        const balance = {
          ...contracts[i],
          amount,
          rewards: [{ ...Alpaca, amount: pendingRewards }],
          category: "farming",
        };
        balances.push(balance);
      }
    }
  }
  return balances;
}
