import { Chain } from "@defillama/sdk/build/general";
import { Contract, Balance } from "@lib/adapter";
import { BaseContext } from "@lib/adapter";
import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers/lib/ethers";
import { abi, getERC20Details } from "@lib/erc20";
import { multicall } from "@lib/multicall";
import { range } from "@lib/array";

const TIME: Contract = {
  name: "Time",
  displayName: "Time Token",
  chain: "avax",
  address: "0xb54f16fb19478766a268f172c9480f8da1a7c9c3",
  decimals: 9,
  symbol: "TIME",
};

export async function getFormattedStakeBalances(
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
      name: "wMEMOToMEMO",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  });

  const formattedBalanceOf = BigNumber.from(formattedBalanceOfRes.output);

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount: formattedBalanceOf,
    underlyings: [{ ...TIME, amount: formattedBalanceOf }],
    category: "stake",
  };

  balances.push(balance);

  return balances;
}

export async function getFarmBalances(
  ctx: BaseContext,
  chain: Chain,
  contract: Contract
) {
  const balances: Balance[] = [];
  const rewards: Balance[] = [];

  const [balanceOfRes, rewardTokenLengthRes] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        constant: true,
        inputs: [],
        name: "rewardTokenLength",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const balanceOf = BigNumber.from(balanceOfRes.output);
  const rewardTokenLength = rewardTokenLengthRes.output;

  const rewardTokensRes = await multicall({
    chain,
    calls: range(0, rewardTokenLength).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: {
      constant: true,
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      name: "rewardTokens",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const rewardTokens = rewardTokensRes
    .filter((res) => res.success)
    .map((res) => res.output);

  const tokens = await getERC20Details(chain, rewardTokens);

  const rewardsBalanceOfRes = await multicall({
    chain,
    calls: tokens.map((token) => ({
      target: contract.address,
      params: [ctx.address, token.address],
    })),
    abi: {
      constant: true,
      inputs: [
        { internalType: "address", name: "account", type: "address" },
        { internalType: "address", name: "_rewardsToken", type: "address" },
      ],
      name: "earned",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const rewardsBalanceOf = rewardsBalanceOfRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output));

  for (let i = 0; i < tokens.length; i++) {
    const reward = {
      ...tokens[i],
      amount: rewardsBalanceOf[i],
    };
    rewards.push(reward);
  }

  for (let i = 0; i < rewardTokenLength; i++) {
    if (rewards[i].amount.gt(0)) {
      const balance: Balance = {
        chain,
        decimals: contract.token.decimals,
        address: contract.token.address,
        symbol: contract.token.symbol,
        amount: balanceOf,
        rewards: [rewards[i]],
        category: "farm",
      };
      balances.push(balance);
    }
  }
  return balances;
}
