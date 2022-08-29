import { Chain } from "@defillama/sdk/build/general";
import { Balance, BaseContext } from "@lib/adapter";
import { getERC20Balances, getERC20Details } from "@lib/erc20";
import { getReserveTokens } from "./tokens";

export type GetLendingPoolBalancesParams = {
  chain: Chain;
  lendingPoolAddress: string;
};

export async function getLendingPoolBalances(
  ctx: BaseContext,
  params: GetLendingPoolBalancesParams
) {
  const balances: Balance[] = [];

  const reserveTokens = await getReserveTokens({
    chain: params.chain,
    lendingPoolAddress: params.lendingPoolAddress,
  });
  const underlyingTokensAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.underlyingTokenAddress
  );
  const aTokens = reserveTokens.map(
    (reserveToken) => reserveToken.aTokenAddress
  );
  const stableDebtTokenAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.stableDebtTokenAddress
  );
  const variableDebtTokenAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.variableDebtTokenAddress
  );

  const [
    underlyingTokens,
    aBalances,
    stableDebtTokenAddressesBalances,
    variableDebtTokenAddressesBalances,
  ] = await Promise.all([
    getERC20Details(params.chain, underlyingTokensAddresses),
    getERC20Balances(ctx, params.chain, aTokens),
    getERC20Balances(ctx, params.chain, stableDebtTokenAddresses),
    getERC20Balances(ctx, params.chain, variableDebtTokenAddresses),
  ]);

  for (let i = 0; i < aBalances.length; i++) {
    const aBalance = aBalances[i];

    balances.push({
      //substitute the token for it's "native" version
      ...underlyingTokens[i],
      amount: aBalance.amount,
      category: "lend",
    });
  }

  for (let i = 0; i < stableDebtTokenAddressesBalances.length; i++) {
    const stableDebtTokenAddressesBalance = stableDebtTokenAddressesBalances[i];

    balances.push({
      //substitute the token for it's "native" version
      ...underlyingTokens[i],
      amount: stableDebtTokenAddressesBalance.amount,
      category: "borrow",
      stable: true,
    });
  }

  for (let i = 0; i < variableDebtTokenAddressesBalances.length; i++) {
    const variableDebtTokenAddressesBalance =
      variableDebtTokenAddressesBalances[i];

    balances.push({
      //substitute the token for it's "native" version
      ...underlyingTokens[i],
      amount: variableDebtTokenAddressesBalance.amount,
      category: "borrow",
      stable: false,
    });
  }

  return balances;
}
