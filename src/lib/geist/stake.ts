import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { providers, Chain } from "@defillama/sdk/build/general";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { getERC20Details } from "@lib/erc20";
import { Token } from "@lib/token";
import MultiFeeDistributionABI from "./abis/MultiFeeDistribution.json";

export type GetMultiFeeDistributionBalancesParams = {
  multiFeeDistributionAddress: string;
  stakingToken: Token;
};

export async function getMultiFeeDistributionBalances(
  ctx: BaseContext,
  chain: Chain,
  lendingPoolContracts: Contract[],
  {
    multiFeeDistributionAddress,
    stakingToken,
  }: GetMultiFeeDistributionBalancesParams
) {
  const balances: Balance[] = [];
  const provider = providers[chain];

  const lendingPoolContractByAddress: { [key: string]: Contract } = {};
  for (const contract of lendingPoolContracts) {
    lendingPoolContractByAddress[contract.address] = contract;
  }

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
      type: "reward",
      claimable: rewardData.amount,
      rates: {
        rate: rewardRate.output.rewardRate,
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

    // reuse contracts from LendingPool to connect reward tokens with their underlyings
    const underlyings =
      lendingPoolContractByAddress[rewardData.token]?.underlyings;
    if (underlyings) {
      reward.underlyings = [{ ...underlyings[0], amount: rewardData.amount }];
    }

    balances.push(reward);
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
