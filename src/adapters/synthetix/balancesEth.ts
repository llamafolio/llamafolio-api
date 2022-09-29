import { Chain } from "@defillama/sdk/build/general";
import { multicall } from "@lib/multicall";
import { BigNumber } from "ethers";
import { Token } from "@lib/token";
import { Contract } from "@lib/adapter";

const sUSDEth: Token = {
  symbol: "sUSD",
  address: "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51",
  decimals: 18,
  chain: "ethereum",
};

const rewardsAddressEth = ["0x3B2f389AeE480238A49E3A9985cd6815370712eB"];

export async function getSNXBalancesETH(ctx: any, chain: Chain, tokens: any) {
  let contracts: Contract[] = [];

  const callsSuppliedAndBorrowed = tokens.map((token: any) => ({
    target: token.address,
    params: [ctx.address],
  }));

  const supplied = await multicall({
    chain,
    calls: callsSuppliedAndBorrowed,
    abi: {
      constant: true,
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "collateral",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const suppliedRes = supplied
    .filter((res) => res.success)
    .map((res) => res.output)
    .join("");

  const borrowed = await multicall({
    chain,
    calls: callsSuppliedAndBorrowed,
    abi: {
      constant: true,
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "remainingIssuableSynths",
      outputs: [
        { internalType: "uint256", name: "maxIssuable", type: "uint256" },
        { internalType: "uint256", name: "alreadyIssued", type: "uint256" },
        {
          internalType: "uint256",
          name: "totalSystemDebt",
          type: "uint256",
        },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const borrowedRes = borrowed
    .filter((res) => res.success)
    .map((res) => res.output);

  const callsRewards = rewardsAddressEth.map((token) => ({
    target: token,
    params: [ctx.address],
  }));

  const rewards = await multicall({
    chain,
    calls: callsRewards,
    abi: {
      constant: true,
      inputs: [{ internalType: "address", name: "account", type: "address" }],
      name: "feesAvailable",
      outputs: [
        { internalType: "uint256", name: "", type: "uint256" },
        { internalType: "uint256", name: "", type: "uint256" },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const rewardRes = rewards
    .filter((res) => res.success)
    .map((res) => res.output);

  for (let i = 0; i < tokens.length; i++) {
    const lendingBalances = {
      ...tokens[i],
      amount: BigNumber.from(suppliedRes),
      underlyings: [
        { ...tokens[0].underlyings[0], amount: BigNumber.from(suppliedRes) },
      ],
      category: "lend",
    };

    const borrowingBalances = {
      ...sUSDEth,
      amount: BigNumber.from(borrowedRes[0][1]),
      category: "borrow",
    };

    const rewardsBalances = [
      {
        ...sUSDEth,
        amount: BigNumber.from(rewardRes[0][0]),
        category: "rewards",
      },
      {
        ...tokens[i],
        amount: BigNumber.from(rewardRes[0][1]),
        underlyings: [
          {
            ...tokens[i].underlyings[0],
            amount: BigNumber.from(rewardRes[0][1]),
          },
        ],
        category: "rewards",
      },
    ];
    contracts.push(
      lendingBalances,
      borrowingBalances,
      rewardsBalances[0],
      rewardsBalances[1]
    );
  }

  return contracts;
}
