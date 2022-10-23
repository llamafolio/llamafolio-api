import { Chain } from "@defillama/sdk/build/general";
import { Contract, Balance } from "@lib/adapter";
import { BaseContext } from "@lib/adapter";
import { abi } from "@lib/erc20";
import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers/lib/ethers";

const FLOOR: Contract = {
  name: "Floor",
  chain: "ethereum",
  address: "0xf59257E961883636290411c11ec5Ae622d19455e",
  decimals: 9,
  symbol: "FLOOR ",
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

  const amount = BigNumber.from(balanceOfRes.output);

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount,
    underlyings: [{ ...FLOOR, amount }],
    category: "stake",
  };
  balances.push(balance);

  return balances;
}

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
      name: "balanceFrom",
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
    underlyings: [{ ...FLOOR, amount: formattedBalanceOf }],
    category: "stake",
  };

  balances.push(balance);
  return balances;
}
