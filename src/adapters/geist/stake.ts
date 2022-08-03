import { multicall } from "../../lib/multicall";
import { ethers, BigNumber } from "ethers";
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

  const tokens = claimableRewards.map(
      (res) => res.token
    );
  const tokenDetails = (await getERC20Details("fantom", tokens))


  const rewards = [];
  for (const rewardData of claimableRewards) {

    const token = tokenDetails.find(o => o.address === rewardData.token);

    let reward: Balance = {
      chain: "fantom",
      address: rewardData.token,
      amount: rewardData.amount,
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
    category: "lock",
  };
  balances.push(lockedBalance);

  const unlockedBalance: Balance = {
    chain: "fantom",
    address: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
    symbol: "GEIST",
    decimals: 18,
    amount: unlockedBalances,
    category: "stake",
  };
  balances.push(unlockedBalance);

  const earnedBalance: Balance = {
    chain: "fantom",
    address: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
    symbol: "GEIST",
    decimals: 18,
    amount: earnedBalances.total,
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


  let totalLMRewards = BigNumber.from('0')
  for (let index = 0; index < lmRewards.length; index++) {
    totalLMRewards = totalLMRewards.add(lmRewards[index].amount)
  }


  const lendingEarnedBalance: Balance = {
    chain: "fantom",
    address: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
    symbol: "GEIST",
    decimals: 18,
    amount: totalLMRewards,
    amountFormatted: totalLMRewards.toString(),
    category: "lending-rewards"
  };
  balances.push(lendingEarnedBalance);

  return balances;
}
