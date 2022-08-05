import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { providers, Chain } from "@defillama/sdk/build/general";
import { Balance, BaseContext } from "@lib/adapter";
import { getERC20Details } from "@lib/erc20";
import { Token } from "@lib/token";
import MultiFeeDistributionABI from "./abis/MultiFeeDistribution.json";
import ChefIncentivesControllerABI from "./abis/ChefIncentivesController.json";

export type GetMultiFeeDistributionBalancesParams = {
  chain: Chain;
  multiFeeDistributionAddress: string;
  chefIncentivesControllerAddress: string;
  stakingToken: Token;
};

export async function getMultiFeeDistributionBalances(
  ctx: BaseContext,
  {
    chain,
    multiFeeDistributionAddress,
    chefIncentivesControllerAddress,
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

  const chefIncentives = new ethers.Contract(
    chefIncentivesControllerAddress,
    ChefIncentivesControllerABI,
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

  let count = 0;

  const stakedSupply = await multiFeeDistribution.totalSupply();

  for (const rewardData of claimableRewards) {
    const token = tokenDetails.find((o) => o.address === rewardData.token);
    if (!token) {
      continue;
    }
    const rewardRateThis = rewardRates[count];
    count++;

    // let apy =  (604800 * (rData.rewardRate / decimal) * assetPrice * 365 / 7  /(geistPrice * totalSupply /1e18));

    let reward: Balance = {
      chain,
      address: rewardData.token,
      amount: rewardData.amount,
      decimals: token.decimals,
      symbol: token.symbol,
      category: "lock-rewards",
      // TODO: rewards interface
      rewardRates: {
        rewardRate: rewardRateThis.rewardRate,
        rewardPeriod: 604800,
        rewardToken: rewardData.token,
        rewardDecimals: token.decimals,
        rewardSymbol: token.symbol,
        //below is the token that you stake or lock to receive the above reward, it is required to calculate an APR
        stakedToken: stakingToken.address,
        stakedSymbol: stakingToken.symbol,
        stakedDecimals: stakingToken.decimals,
        stakedSupply: stakedSupply,
      },
    };
    balances.push(reward);
  }

  const lockedBalance: Balance = {
    chain,
    address: stakingToken.address,
    symbol: stakingToken.symbol,
    decimals: stakingToken.decimals,
    amount: lockedBalances.total,
    category: "lock",
  };
  balances.push(lockedBalance);

  const unlockedBalance: Balance = {
    chain,
    address: stakingToken.address,
    symbol: stakingToken.symbol,
    decimals: stakingToken.decimals,
    amount: unlockedBalances,
    category: "stake",
  };
  balances.push(unlockedBalance);

  const earnedBalance: Balance = {
    chain,
    address: stakingToken.address,
    symbol: stakingToken.symbol,
    decimals: stakingToken.decimals,
    amount: earnedBalances.total,
    category: "vest",
  };
  balances.push(earnedBalance);

  const lmRewardsCount = (await chefIncentives.poolLength()).toNumber();

  const registeredTokensRes = await multicall({
    chain,
    calls: Array(lmRewardsCount)
      .fill(undefined)
      .map((_, i) => ({
        target: chefIncentives.address,
        params: [i],
      })),
    abi: {
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      name: "registeredTokens",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
  });
  const registeredTokensAddresses = registeredTokensRes.map(
    (res) => res.output
  );

  const lmClaimableRewards: BigNumber[] = await chefIncentives.claimableReward(
    ctx.address,
    registeredTokensAddresses
  );

  // collect aTokens underlyings
  const underlyingTokensAddresses = await multicall({
    chain,
    calls: registeredTokensAddresses.map((address) => ({
      target: address,
      params: [],
    })),
    abi: {
      inputs: [],
      name: "UNDERLYING_ASSET_ADDRESS",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
  });

  const lmRewards = lmClaimableRewards.map((reward, i) => ({
    amount: reward,
    underlying: underlyingTokensAddresses[i].output,
  }));

  let totalLMRewards = BigNumber.from("0");
  for (let index = 0; index < lmRewards.length; index++) {
    totalLMRewards = totalLMRewards.add(lmRewards[index].amount);
  }

  const lendingEarnedBalance: Balance = {
    chain,
    address: stakingToken.address,
    symbol: stakingToken.symbol,
    decimals: stakingToken.decimals,
    amount: totalLMRewards,
    category: "lend-rewards",
  };
  balances.push(lendingEarnedBalance);

  return balances;
}
