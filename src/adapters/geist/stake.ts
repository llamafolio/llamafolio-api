import BN from "bignumber.js";
import BigNumber from "@ethersproject/bignumber"
import { ethers } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { Balance, BalanceContext, Contract } from "../../lib/adapter";
import { getERC20Details } from "../../lib/erc20";

import MultiFeeDistributionABI from "./abis/MultiFeeDistribution.json";

export const multiFeeDistributionContract: Contract = {
  name: "MultiFeeDistribution",
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




  const rewards = [];
  for (const rewardData of claimableRewards) {


    let token = (await getERC20Details("fantom",[rewardData.token]))[0] //need to use multicall

    let reward: Balance = {
      chain: "fantom",
      address: rewardData.token,
      amount: rewardData.amount,
      amountFormatted: rewardData.amount.toString(),
      decimals: token.decimals,
      symbol: token.symbol,
      category: 'rewards'
    };
    balances.push(reward)
  }

  const lockedBalance: Balance = {
    chain: "fantom",
    address: "0xd8321AA83Fb0a4ECd6348D4577431310A6E0814d",
    symbol: "GEIST",
    decimals: 18,
    amount: lockedBalances.total,
    amountFormatted: lockedBalances.total.toString(),
    category: "lock-rewards",
    // expired locked
    // unlockable: lockedBalances.unlockable,
    // locked: lockedBalances.locked,
    // lock + expiry dates:
    // [amount_0, timestamp_0, amount_1, timestamp_1, ...]
    // lockData: lockedBalances.lockData,
  };


  balances.push(lockedBalance);

  return balances;
}
