import { BaseContext, Contract, Balance } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { abi } from "@lib/erc20";
import { BigNumber } from "ethers";
import { multicall } from "@lib/multicall";

export interface BalanceWithExtraProps extends Balance {
  lockEnd: string;
}

const TEMPLE: Contract = {
  name: "Temple",
  displayName: "Temple Token",
  chain: "ethereum",
  address: "0x470ebf5f030ed85fc1ed4c2d36b9dd02e77cf1b7",
  decimals: 18,
  symbol: "TEMPLE ",
};

const TempleStaking: Contract = {
  name: "Temple staking",
  chain: "ethereum",
  address: "0x4D14b24EDb751221B3Ff08BBB8bd91D4b1c8bc77",
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

  const formattedBalanceRes = await call({
    chain,
    target: TempleStaking.address,
    params: [balanceOf],
    abi: {
      inputs: [
        { internalType: "uint256", name: "amountOgTemple", type: "uint256" },
      ],
      name: "balance",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  });

  const formattedBalance = BigNumber.from(formattedBalanceRes.output);

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: contract.decimals,
    amount: formattedBalance,
    underlyings: [{ ...TEMPLE, amount: formattedBalance }],
    category: "stake",
  };

  balances.push(balance);

  return balances;
}

export async function getLockedBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = [];

  const calls = contracts.map((contract) => ({
    target: contract.address,
    params: [],
  }));

  const [balancesLockedRes, startLockedRes, endLockedRes] = await Promise.all([
    multicall({
      chain,
      calls: contracts.map((contract) => ({
        target: contract.address,
        params: [ctx.address],
      })),
      abi: abi.balanceOf,
    }),

    multicall({
      chain,
      calls,
      abi: {
        inputs: [],
        name: "firstPeriodStartTimestamp",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),

    multicall({
      chain,
      calls,
      abi: {
        inputs: [],
        name: "periodDuration",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const balancesLocked = balancesLockedRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output));

  const startLocked = startLockedRes
    .filter((res) => res.success)
    .map((res) => res.output * 1000);

  const endLocked = endLockedRes
    .filter((res) => res.success)
    .map((res) => res.output * 1000);

  for (let i = 0; i < contracts.length; i++) {
    const lockedBalance = new Date(
      startLocked[i] + endLocked[i]
    ).toLocaleDateString("en-US");

    const balance: BalanceWithExtraProps = {
      chain,
      decimals: contracts[i].decimals,
      symbol: contracts[i].symbol,
      address: contracts[i].address,
      amount: balancesLocked[i],
      underlyings: [{ ...TEMPLE, amount: balancesLocked[i] }],
      lockEnd: lockedBalance,
      category: "lock",
    };
    balances.push(balance);
  }
  return balances;
}
