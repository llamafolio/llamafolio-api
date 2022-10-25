import { call } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { BaseContext, Contract, Balance } from "@lib/adapter";
import { abi } from "@lib/erc20";
import { BigNumber } from "ethers";
import { getUnderlyingsBalances } from "./helper";

const Aave: Contract = {
  name: "Aave Token",
  address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
  chain: "ethereum",
  symbol: "AAVE",
  decimals: 18,
};

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contract: Contract
) {
  const balances: Balance[] = [];

  const [balanceOfRes, rewardsRes] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: "address", name: "staker", type: "address" }],
        name: "getTotalRewardsBalance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const amount = BigNumber.from(balanceOfRes.output);
  const rewards = BigNumber.from(rewardsRes.output);

  const balance: Balance = {
    chain,
    address: contract.address,
    decimals: contract.decimals,
    symbol: contract.symbol,
    amount,
    category: "stake",
    underlyings: [
      {
        chain,
        address: Aave.address,
        decimals: Aave.decimals,
        symbol: Aave.symbol,
        amount,
      },
    ],
    rewards: [
      {
        chain,
        address: Aave.address,
        decimals: Aave.decimals,
        symbol: Aave.symbol,
        amount: rewards,
      },
    ],
  };
  balances.push(balance);

  return balances;
}

export async function getStakeBalancerPoolBalances(
  ctx: BaseContext,
  chain: Chain,
  contract: Contract
) {
  const balances: Balance[] = [];

  const [balanceOfRes, rewardsRes] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: "address", name: "staker", type: "address" }],
        name: "getTotalRewardsBalance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const balanceOf = BigNumber.from(balanceOfRes.output);
  const rewards = BigNumber.from(rewardsRes.output);

  const underlyings = await getUnderlyingsBalances(chain, balanceOf);

  const balance: Balance = {
    chain,
    address: contract.address,
    decimals: contract.decimals,
    symbol: contract.symbol,
    amount: BigNumber.from(balanceOf),
    underlyings,
    rewards: [
      {
        chain,
        address: Aave.address,
        decimals: Aave.decimals,
        symbol: Aave.symbol,
        amount: rewards,
      },
    ],
    category: "stake",
  };
  balances.push(balance);
  return balances;
}
