import { Chain } from "@defillama/sdk/build/general";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers";
import { abi } from "@lib/erc20";
import { getRatioTokens } from "./helper";

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contract?: Contract
) {
  if (!contract || !contract.underlyings?.[0]) {
    return [];
  }
  const balances: Balance[] = [];

  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  });

  const balanceOf = balanceOfRes.output;

  const formattedBalanceOfRes = await call({
    chain,
    target: contract.address,
    params: [balanceOf],
    abi: {
      inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
      name: "wsHECTosHEC",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  });

  const amount = BigNumber.from(formattedBalanceOfRes.output);

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount,
    underlyings: [{ ...contract.underlyings?.[0], amount }],
    category: "stake",
  };

  balances.push(balance);
  return balances;
}

export async function getFarmingBalances(
  ctx: BaseContext,
  chain: Chain,
  contract?: Contract
) {
  if (!contract || !contract.underlyings?.[0]) {
    return [];
  }

  const curveContract: Contract = contract.underlyings?.[0];

  if (!curveContract.underlyings || !curveContract.rewards?.[0]) {
    return [];
  }

  const balances: Balance[] = [];

  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: {
      inputs: [{ internalType: "address", name: "wallet", type: "address" }],
      name: "calWithdrawAndEarned",
      outputs: [
        {
          internalType: "uint256",
          name: "_torWithdrawAmount",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_daiWithdrawAmount",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_usdcWithdrawAmount",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_earnedRewardAmount",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  const amount = BigNumber.from(balanceOfRes.output._torWithdrawAmount);
  const rewardsBalanceOf = BigNumber.from(
    balanceOfRes.output._earnedRewardAmount
  );

  const shares = await getRatioTokens("fantom");

  /**
   * div by the same amount of mul we've choosen on the helper
   */

  const underlyings = curveContract.underlyings?.map((token, i) => ({
    ...token,
    amount: amount.mul(shares[i]).div(10 ** 8),
  }));

  const balance: Balance = {
    address: curveContract.address,
    chain,
    amount,
    symbol: `TOR-DAI-USDC`,
    decimals: 18,
    underlyings,
    rewards: [{ ...curveContract.rewards[0], amount: rewardsBalanceOf }],
    category: "farm",
  };

  balances.push(balance);
  return balances;
}
