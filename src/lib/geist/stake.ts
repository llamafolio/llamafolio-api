import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { providers, Chain } from "@defillama/sdk/build/general";
import { Balance, BaseContext, RewardBalance } from "@lib/adapter";
import { getERC20Details } from "@lib/erc20";
import { Token } from "@lib/token";
import MultiFeeDistributionABI from "./abis/MultiFeeDistribution.json";

export type GetMultiFeeDistributionBalancesParams = {
  chain: Chain;
  multiFeeDistributionAddress: string;
  stakingToken: Token;
};

export async function getMultiFeeDistributionBalances(
  ctx: BaseContext,
  {
    chain,
    multiFeeDistributionAddress,
    stakingToken,
  }: GetMultiFeeDistributionBalancesParams
) {
  const balances: Balance[] = [];
  const provider = providers[chain];

  const multiFeeDistribution = new ethers.Contract(
    multiFeeDistributionAddress,
    MultiFeeDistributionABI,
    provider
  );

  const [claimableRewards, lockedBalances, unlockedBalances, earnedBalances] =
    await Promise.all([
      multiFeeDistribution.claimableRewards(ctx.address),
      multiFeeDistribution.lockedBalances(ctx.address),
      multiFeeDistribution.unlockedBalance(ctx.address),
      multiFeeDistribution.earnedBalances(ctx.address),
    ]);

  const tokens = claimableRewards.map((res: any) => res.token);
  const tokenDetails = await getERC20Details(chain, tokens);
  const tokenByAddress: { [key: string]: Token } = {};
  for (const token of tokenDetails) {
    tokenByAddress[token.address] = token;
  }

  const lockedBalance: Balance = {
    chain,
    address: stakingToken.address,
    symbol: stakingToken.symbol,
    decimals: stakingToken.decimals,
    amount: lockedBalances.total,
    category: "lock",
    rewards: [],
  };
  balances.push(lockedBalance);

  const unlockedBalance: Balance = {
    chain,
    address: stakingToken.address,
    symbol: stakingToken.symbol,
    decimals: stakingToken.decimals,
    amount: unlockedBalances,
    category: "stake",
    rewards: [],
  };
  balances.push(unlockedBalance);

  const rewardRates = await multicall({
    chain,
    calls: tokenDetails.map((t) => ({
      target: multiFeeDistribution.address,
      params: t.address,
    })),
    abi: {
      inputs: [{ internalType: "address", name: "", type: "address" }],
      name: "rewardData",
      outputs: [
        { internalType: "uint256", name: "periodFinish", type: "uint256" },
        { internalType: "uint256", name: "rewardRate", type: "uint256" },
        {
          internalType: "uint256",
          name: "lastUpdateTime",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "rewardPerTokenStored",
          type: "uint256",
        },
        { internalType: "uint256", name: "balance", type: "uint256" },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  const stakedSupply = await multiFeeDistribution.totalSupply();

  for (let i = 0; i < claimableRewards.length; i++) {
    const rewardData = claimableRewards[i];

    const token = tokenByAddress[rewardData.token];
    if (!token) {
      continue;
    }
    const rewardRate = rewardRates[i];

    // let apy =  (604800 * (rData.rewardRate / decimal) * assetPrice * 365 / 7  /(geistPrice * totalSupply /1e18));

    let reward: Balance = {
      chain,
      address: rewardData.token,
      amount: rewardData.amount,
      decimals: token.decimals,
      symbol: token.symbol,
      category: "reward",
      // TODO: rewards interface
      rates: {
        rate: rewardRate.rewardRate,
        period: 604800,
        token: rewardData.token,
        decimals: token.decimals,
        symbol: token.symbol,
        //below is the token that you stake or lock to receive the above reward, it is required to calculate an APR
        stakedToken: stakingToken.address,
        stakedSymbol: stakingToken.symbol,
        stakedDecimals: stakingToken.decimals,
        stakedSupply: stakedSupply,
      },
    };

    // staking only
    if (!lockedBalance.amount.gt(0) && unlockedBalance.amount.gt(0)) {
      unlockedBalance.rewards?.push(reward);
    } else {
      // if both staking and locking, can't tell if aTokens rewards come from one or the other
      lockedBalance.rewards?.push(reward);
    }
  }

  const earnedBalance: Balance = {
    chain,
    address: stakingToken.address,
    symbol: stakingToken.symbol,
    decimals: stakingToken.decimals,
    amount: earnedBalances.total,
    category: "vest",
  };
  balances.push(earnedBalance);

  return balances;
}
