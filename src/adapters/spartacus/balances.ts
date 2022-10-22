import { BaseContext, Contract, Balance } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { abi } from "@lib/erc20";
import { BigNumber } from "ethers";

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
