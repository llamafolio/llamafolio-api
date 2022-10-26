import { Chain } from "@defillama/sdk/build/general";
import { Contract, Balance } from "@lib/adapter";
import { BaseContext } from "@lib/adapter";
import { abi } from "@lib/erc20";
import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers/lib/ethers";

export async function getStakeBalance(
  ctx: BaseContext,
  chain: Chain,
  contract?: Contract
) {
  if (!contract || !contract.underlyings?.[0]) {
    return;
  }

  try {
    const balanceOfRes = await call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    });

    const amount = BigNumber.from(balanceOfRes.output);

    const balance: Balance = {
      ...contract,
      amount,
      underlyings: [{ ...contract.underlyings?.[0], amount }],
      category: "stake",
    };

    return balance;
  } catch (error) {
    return;
  }
}
