import { Chain } from "@defillama/sdk/build/general";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers";
import { abi } from "@lib/erc20";
import { getRatioTokens } from "./helper";

const HEC: Contract = {
  name: "Hector",
  displayName: "Hector",
  chain: "fantom",
  address: "0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0",
  decimals: 9,
  symbol: "HEC",
};

const TOR: Contract = {
  name: "TOR",
  chain: "fantom",
  address: "0x74e23df9110aa9ea0b6ff2faee01e740ca1c642e",
  decimals: 18,
  symbol: "TOR",
};

const DAI: Contract = {
  name: "Dai Stablecoin",
  chain: "fantom",
  address: "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
  decimals: 18,
  symbol: "DAI",
};

const USDC: Contract = {
  name: "USD Coin",
  chain: "fantom",
  address: "0x04068da6c83afcfa0e13ba15a6696662335d5b75",
  decimals: 18,
  symbol: "USDC",
};

const wFTM: Contract = {
  name: "Wrapped Fantom",
  chain: "fantom",
  address: "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
  decimals: 18,
  symbol: "wFTM",
};

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contract: Contract
) {
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
    ...contract,
    rewards: undefined,
    amount,
    underlyings: [{ ...HEC, amount }],
    category: "stake",
  };

  balances.push(balance);
  return balances;
}

export async function getFarmingBalances(
  ctx: BaseContext,
  chain: Chain,
  contract: Contract
) {
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

  const balanceOf = BigNumber.from(balanceOfRes.output._torWithdrawAmount);
  const rewardsBalanceOf = BigNumber.from(
    balanceOfRes.output._earnedRewardAmount
  );

  const share = await getRatioTokens("fantom");

  /**
   * div by the same amount of mul we choosen on the helper
   */

  const TORAmount = balanceOf.mul(share.TOR).div(10 ** 8);
  const DAIAmount = balanceOf.mul(share.DAI).div(10 ** 8);
  const USDCAmount = balanceOf.mul(share.USDC).div(10 ** 8);

  const balance: Balance = {
    address: "0x24699312CB27C26Cfc669459D670559E5E44EE60",
    chain,
    amount: balanceOf,
    symbol: `TOR-DAI-USDC`,
    decimals: 18,
    underlyings: [
      { ...TOR, amount: TORAmount },
      { ...DAI, amount: DAIAmount },
      { ...USDC, amount: USDCAmount },
    ],
    rewards: [{ ...wFTM, amount: rewardsBalanceOf }],
    category: "farm",
  };

  balances.push(balance);
  return balances;
}
