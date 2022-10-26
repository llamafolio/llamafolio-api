import { BaseContext, Contract, Balance } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { abi } from "@lib/erc20";
import { BigNumber } from "ethers";
import { multicall } from "@lib/multicall";

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

  const amount = BigNumber.from(balanceOfRes.output);

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

export async function getBondBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = [];

  const calls = contracts.map((contract) => ({
    target: contract.address,
    params: [ctx.address],
  }));

  const [vestingBalanceOfRes, pendingBalanceOfRes] = await Promise.all([
    multicall({
      chain,
      calls,
      abi: {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "bondInfo",
        outputs: [
          { internalType: "uint256", name: "payout", type: "uint256" },
          { internalType: "uint256", name: "vesting", type: "uint256" },
          { internalType: "uint256", name: "lastBlock", type: "uint256" },
          { internalType: "uint256", name: "pricePaid", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
      },
    }),

    multicall({
      chain,
      calls,
      abi: {
        inputs: [
          { internalType: "address", name: "_depositor", type: "address" },
        ],
        name: "pendingPayoutFor",
        outputs: [
          { internalType: "uint256", name: "pendingPayout_", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const vestingBalanceOf = vestingBalanceOfRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output.payout));

  const pendingBalanceOf = pendingBalanceOfRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output));

  for (let i = 0; i < contracts.length; i++) {
    if (!contracts[i].underlyings?.[0] || !contracts[i].rewards?.[0]) {
      return [];
    }

    const underlyings = contracts[i].underlyings?.map((underlying) => ({
      ...underlying,
      amount: vestingBalanceOf[i],
    }));

    const rewards = contracts[i].rewards?.map((reward) => ({
      ...reward,
      amount: pendingBalanceOf[i],
    }));

    const balance: Balance = {
      chain,
      decimals: 9,
      symbol: contracts[i].symbol,
      address: contracts[i].address,
      amount: vestingBalanceOf[i],
      underlyings,
      rewards,
      category: "vest",
    };
    balances.push(balance);
  }
  return balances;
}
