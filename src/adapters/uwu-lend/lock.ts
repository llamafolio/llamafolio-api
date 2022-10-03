import { ethers } from "ethers";
import { providers, Chain } from "@defillama/sdk/build/general";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { getERC20Details } from "@lib/erc20";
import { Token } from "@lib/token";
import MultiFeeDistributionABI from "./abis/MultiFeeDistribution.json";
import {
  getUnderlyingBalances,
  getUnderlyingsContract,
} from "@lib/uniswap/v2/pair";

export type GetMultiFeeDistributionBalancesParams = {
  multiFeeDistributionAddress: string;
};

export async function getMultiFeeDistributionBalances(
  ctx: BaseContext,
  chain: Chain,
  lendingPoolContracts: Contract[],
  { multiFeeDistributionAddress }: GetMultiFeeDistributionBalancesParams
) {
  const balances: Balance[] = [];
  const provider = providers[chain];

  const lendingPoolContractByAddress: { [key: string]: Contract } = {};
  for (const contract of lendingPoolContracts) {
    lendingPoolContractByAddress[contract.address.toLowerCase()] = contract;
  }

  const multiFeeDistribution = new ethers.Contract(
    multiFeeDistributionAddress,
    MultiFeeDistributionABI,
    provider
  );

  const [
    stakingTokenAddress,
    rewardTokenAddress,
    claimableRewards,
    lockedBalances,
    withdrawableBalance,
  ] = await Promise.all([
    multiFeeDistribution.stakingToken(),
    multiFeeDistribution.rewardToken(),
    multiFeeDistribution.claimableRewards(ctx.address),
    multiFeeDistribution.lockedBalances(ctx.address),
    multiFeeDistribution.withdrawableBalance(ctx.address),
  ]);

  let [stakingToken, rewardToken] = await getERC20Details("ethereum", [
    stakingTokenAddress,
    rewardTokenAddress,
  ]);
  stakingToken = await getUnderlyingsContract(stakingToken);

  const tokens = claimableRewards.map((res: any) => res.token);
  const tokenDetails = await getERC20Details(chain, tokens);
  const tokenByAddress: { [key: string]: Token } = {};
  for (const token of tokenDetails) {
    tokenByAddress[token.address] = token;
  }

  // get balances of Sushi staking LP token
  const [lockedBalance] = await getUnderlyingBalances(chain, [
    { ...stakingToken, amount: lockedBalances.total, rewards: [] } as Balance,
  ]);

  if (lockedBalance) {
    for (let i = 0; i < claimableRewards.length; i++) {
      const rewardData = claimableRewards[i];

      const token = tokenByAddress[rewardData.token];
      if (!token) {
        continue;
      }
      let reward: Balance = {
        chain,
        address: rewardData.token,
        amount: rewardData.amount,
        decimals: token.decimals,
        symbol: token.symbol,
        category: "reward",
        type: "reward",
        claimable: rewardData.amount,
      };

      // reuse contracts from LendingPool to connect reward tokens with their underlyings
      const underlyings =
        lendingPoolContractByAddress[rewardData.token.toLowerCase()]
          ?.underlyings;
      if (underlyings) {
        reward.underlyings = [{ ...underlyings[0], amount: rewardData.amount }];
      }

      lockedBalance.rewards!.push(reward);
    }

    balances.push(lockedBalance);
  }

  const rewardBalance: Balance = {
    ...rewardToken,
    amount: withdrawableBalance.amount,
    category: "reward",
  };
  balances.push(rewardBalance);

  return balances;
}
