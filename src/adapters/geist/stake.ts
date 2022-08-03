import { multicall } from "../../lib/multicall";
import BN from "bignumber.js";
import { ethers } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { Balance, BalanceContext, Contract } from "../../lib/adapter";
import { getERC20Details } from "../../lib/erc20";
import MultiFeeDistributionABI from "./abis/MultiFeeDistribution.json";
import ChiefIncentivesABI from "./abis/ChiefIncentives.json";

export const multiFeeDistributionContract: Contract = {
  name: "MultiFeeDistribution",
  dName: "Geist Locker",
  chain: "fantom",
  address: "0x49c93a95dbcc9A6A4D8f77E59c038ce5020e82f8",
};

export async function getMultiFeeDistributionBalances(ctx: BalanceContext) {
  const balances: Balance[] = [];
  const provider = providers["fantom"];

  const multiFeeDistribution = new ethers.Contract(
    "0x49c93a95dbcc9A6A4D8f77E59c038ce5020e82f8",
    MultiFeeDistributionABI,
    provider
  );

  const chefIncentives = new ethers.Contract(
    "0x297FddC5c33Ef988dd03bd13e162aE084ea1fE57",
    ChiefIncentivesABI,
    provider
  );

  const [claimableRewards, lockedBalances, unlockedBalances, earnedBalances] =
    await Promise.all([
      multiFeeDistribution.claimableRewards(ctx.address),
      multiFeeDistribution.lockedBalances(ctx.address),
      multiFeeDistribution.unlockedBalance(ctx.address),
      multiFeeDistribution.earnedBalances(ctx.address),
    ]);

  const rewards = [];
  for (const rewardData of claimableRewards) {
    let token = (await getERC20Details("fantom", [rewardData.token]))[0]; //need to use multicall

    let reward: Balance = {
      chain: "fantom",
      address: rewardData.token,
      amount: rewardData.amount,
      amountFormatted: rewardData.amount.toString(),
      decimals: token.decimals,
      symbol: token.symbol,
      category: "lock-rewards",
    };
    balances.push(reward);
  }

  const lockedBalance: Balance = {
    chain: "fantom",
    address: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
    symbol: "GEIST",
    decimals: 18,
    amount: lockedBalances.total,
    amountFormatted: lockedBalances.total.toString(),
    category: "lock",
  };
  balances.push(lockedBalance);

  const unlockedBalance: Balance = {
    chain: "fantom",
    address: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
    symbol: "GEIST",
    decimals: 18,
    amount: unlockedBalances,
    amountFormatted: unlockedBalances.toString(),
    category: "staked",
  };
  balances.push(unlockedBalance);

  const earnedBalance: Balance = {
    chain: "fantom",
    address: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
    symbol: "GEIST",
    decimals: 18,
    amount: earnedBalances.total,
    amountFormatted: earnedBalances.total.toString(),
    category: "vest",
  };
  balances.push(earnedBalance);

  const lmRewardsCount = (await chefIncentives.poolLength()).toNumber();

  const registeredTokensRes = await multicall({
    chain: "fantom",
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

  const lmClaimableRewards = await chefIncentives.claimableReward(
    ctx.address,
    registeredTokensAddresses
  );

  // collect aTokens underlyings
  const underlyingTokensAddresses = await multicall({
    chain: "fantom",
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

  // const lendingEarnedBalance: Balance = {
  //   chain: "fantom",
  //   address: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
  //   symbol: "GEIST",
  //   decimals: 18,
  //   amount: 0,
  //   amountFormatted: 0,
  //   category: "lending-rewards"
  // };
  // balances.push(lendingEarnedBalance);

  return balances;
}
