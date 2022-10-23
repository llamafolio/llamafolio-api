import { BaseContext, Contract, Balance } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { abi } from "@lib/erc20";
import { BigNumber } from "ethers";
import { multicall } from "@lib/multicall";

const SPA: Contract = {
  name: "Spartacus ",
  displayName: "Spartacus ",
  chain: "fantom",
  address: "0x5602df4A94eB6C680190ACCFA2A475621E0ddBdc",
  decimals: 9,
  symbol: "SPA",
};

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  sSPA: Contract
) {
  const balances: Balance[] = [];

  const balanceOfRes = await call({
    chain,
    target: sSPA.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  });

  const balanceOf = BigNumber.from(balanceOfRes.output);

  const balance: Balance = {
    chain,
    address: sSPA.address,
    symbol: sSPA.symbol,
    decimals: 9,
    amount: balanceOf,
    underlyings: [{ ...SPA, amount: balanceOf }],
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
    const balance: Balance = {
      chain,
      decimals: SPA.decimals,
      symbol: contracts[i].symbol,
      address: contracts[i].address,
      amount: vestingBalanceOf[i],
      underlyings: [{ ...SPA, amount: vestingBalanceOf[i] }],
      rewards: [{ ...SPA, amount: pendingBalanceOf[i] }],
      category: "vest",
    };
    balances.push(balance);
  }
  return balances;
}
