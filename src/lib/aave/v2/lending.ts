import { Chain } from "@defillama/sdk/build/general";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { getERC20BalanceOf, getERC20Details } from "@lib/erc20";
import { Token } from "@lib/token";
import { BigNumber } from "ethers";
import { getReserveTokens } from "./tokens";

export async function getLendingPoolContracts(
  chain: Chain,
  lendingPoolAddress: string
) {
  const contracts: Contract[] = [];

  const reserveTokens = await getReserveTokens({ chain, lendingPoolAddress });
  const underlyingTokensAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.underlyingTokenAddress
  );
  const aTokensAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.aTokenAddress
  );
  const stableDebtTokenAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.stableDebtTokenAddress
  );
  const variableDebtTokenAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.variableDebtTokenAddress
  );

  const [underlyingTokens, aTokens, stableDebtTokens, variableDebtTokens] =
    await Promise.all([
      getERC20Details(chain, underlyingTokensAddresses),
      getERC20Details(chain, aTokensAddresses),
      getERC20Details(chain, stableDebtTokenAddresses),
      getERC20Details(chain, variableDebtTokenAddresses),
    ]);

  for (let i = 0; i < aTokens.length; i++) {
    const aToken = aTokens[i];

    contracts.push({
      ...aToken,
      priceSubstitute: underlyingTokens[i].address,
      underlyings: [underlyingTokens[i]],
      category: "lend",
    });
  }

  for (let i = 0; i < stableDebtTokens.length; i++) {
    const stableDebtToken = stableDebtTokens[i];

    contracts.push({
      ...stableDebtToken,
      priceSubstitute: underlyingTokens[i].address,
      underlyings: [underlyingTokens[i]],
      type: "debt",
      category: "borrow",
      stable: true,
    });
  }

  for (let i = 0; i < variableDebtTokens.length; i++) {
    const variableDebtToken = variableDebtTokens[i];

    contracts.push({
      ...variableDebtToken,
      priceSubstitute: underlyingTokens[i].address,
      underlyings: [underlyingTokens[i]],
      type: "debt",
      category: "borrow",
      stable: false,
    });
  }

  return contracts;
}

export async function getLendingPoolBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = await getERC20BalanceOf(
    ctx,
    chain,
    contracts as Token[]
  );

  // use the same amount for underlyings
  for (const balance of balances) {
    if (balance.amount.gt(0) && balance.underlyings) {
      balance.underlyings[0].amount = BigNumber.from(balance.amount);
    }
  }

  return balances;
}
