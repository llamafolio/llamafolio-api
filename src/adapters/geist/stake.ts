import BN from "bignumber.js";
import { ethers } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { Balance, BalanceContext, Contract } from "../../lib/adapter";
import MultiFeeDistributionABI from "./abis/MultiFeeDistribution.json";

export const multiFeeDistributionContract: Contract = {
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

  const [claimableRewards, lockedBalances] = await Promise.all([
    multiFeeDistribution.claimableRewards(ctx.address),
    multiFeeDistribution.lockedBalances(ctx.address),
  ]);

  // TODO: figure out where to put rewards
  const rewards = [];
  for (const rewardData of claimableRewards) {
    rewards.push({
      chain: "fantom",
      address: rewardData.token,
      amount: new BN(rewardData.amount),
      decimals: 18,
    });
  }

  const lockedToken: Balance = {
    chain: "fantom",
    address: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
    symbol: "GEIST",
    decimals: 18,
    amount: new BN(lockedBalances.total),
    category: "lock",
    // expired locked
    // unlockable: lockedBalances.unlockable,
    // locked: lockedBalances.locked,
    // lock + expiry dates:
    // [amount_0, timestamp_0, amount_1, timestamp_1, ...]
    // lockData: lockedBalances.lockData,
  };
  balances.push(lockedToken);

  return balances;
}
