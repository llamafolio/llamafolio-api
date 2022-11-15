import { call } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { BaseContext, Contract, Balance } from "@lib/adapter";
import { abi } from "@lib/erc20";
import { BigNumber } from "ethers";

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contract?: Contract
) {
  if (!contract || !contract.underlyings) {
    console.log("Missing or inccorect contract");

    return [];
  }

  try {
    const balances: Balance[] = [];
    const COMP = contract.underlyings?.[0];

    const balanceOfRes = await call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    });

    const amount = BigNumber.from(balanceOfRes.output);

    balances.push({
      chain,
      address: COMP.address,
      decimals: COMP.decimals,
      symbol: COMP.symbol,
      amount,
      category: "stake",
    });

    return balances;
  } catch (error) {
    console.log("Failed to get stake balance");

    return [];
  }
}
