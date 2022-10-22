import { BaseContext, Contract, Balance } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { abi } from "@lib/erc20";
import { BigNumber } from "ethers";

const NMS: Contract = {
  name: "Nemesis DAO",
  displayName: "Nemesis DAO",
  chain: "bsc",
  address: "0x8AC9DC3358A2dB19fDd57f433ff45d1fc357aFb3",
  decimals: 9,
  symbol: "NMS",
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

  const balanceOf = BigNumber.from(balanceOfRes.output);

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount: balanceOf,
    underlyings: [{ ...NMS, amount: balanceOf }],
    category: "stake",
  };

  balances.push(balance);

  return balances;
}
