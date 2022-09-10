import { BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { returnMasterChefDetails } from "@lib/masterchef";
import { getUnderlyingBalances } from "@lib/uniswap/v2/pair";
import { Balance, BaseContext, BaseContract } from "@lib/adapter";

export async function getBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: BaseContract[]
) {
  let balances: Balance[] = [];

  for (let index = 0; index < contracts.length; index++) {
    const contract = contracts[index];

    if (contract.name === "masterChef") {
      const masterDetails = await returnMasterChefDetails(
        ctx,
        chain,
        contract.address,
        "pendingSushi"
      );

      const fetchUnderlyings = [];

      for (let yy = 0; yy < masterDetails.length; yy++) {
        const masterRow = masterDetails[yy];
        balances.push({
          chain: chain,
          category: "lp",
          symbol: masterRow.token.symbol,
          decimals: masterRow.token.decimals,
          address: masterRow.token.address,
          amount: BigNumber.from(masterRow.amount),
          yieldsAddress: masterRow.token.address,
        });

        fetchUnderlyings.push({
          ...masterRow.token,
          amount: BigNumber.from(masterRow.amount),
        });

        if (masterRow.rewardsPending > 0) {
          balances.push({
            chain: chain,
            category: "reward",
            symbol: "SUSHI",
            decimals: 18,
            address: "0x9813037ee2218799597d83D4a5B6F3b6778218d9",
            amount: BigNumber.from(masterRow.rewardsPending),
            reward: true,
            parent: masterRow.token.address,
          });
        }
      }

      // const underlyingBalances = await getUnderlyingBalances(
      //   chain,
      //   fetchUnderlyings
      // );
      // balances = balances.concat(underlyingBalances);
    }
  }

  return balances;
}
