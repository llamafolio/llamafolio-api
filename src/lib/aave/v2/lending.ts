import { Balance, BalanceContext } from "../../adapter";
import { getERC20Balances } from "../../erc20";
import { getReserveTokens } from "./tokens";

export type GetLendingPoolBalancesParams = {
  lendingPoolAddress: string;
};

export async function getLendingPoolBalances(
  ctx: BalanceContext,
  params: GetLendingPoolBalancesParams
) {
  const balances: Balance[] = [];

  const reserveTokens = await getReserveTokens({
    chain: ctx.chain,
    lendingPoolAddress: params.lendingPoolAddress,
  });
  const aTokens = reserveTokens.map(
    (reserveToken) => reserveToken.aTokenAddress
  );
  const stableDebtTokenAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.stableDebtTokenAddress
  );
  const variableDebtTokenAddresses = reserveTokens.map(
    (reserveToken) => reserveToken.variableDebtTokenAddress
  );

  //fetch aTokens (supplied)
  let aBalances = await getERC20Balances(ctx, ctx.chain, aTokens);

  for (let index = 0; index < aBalances.length; index++) {
    aBalances[index].amount = aBalances[index].amount;
    aBalances[index].category = "lending-supplied";
    //save the details of the real token
    aBalances[index].realToken = aBalances[index];
    //substitute the token for it's "native" version
    aBalances[index].address = reserveTokens[index].underlyingTokenAddress;

    let aBalanceFormat = aBalances[index];
    const aBalance: Balance = aBalanceFormat;
    balances.push(aBalance);
  }

  //fetch debt tokens

  let stableDebtTokenAddressesBalances = await getERC20Balances(
    ctx,
    ctx.chain,
    stableDebtTokenAddresses
  );

  for (
    let index = 0;
    index < stableDebtTokenAddressesBalances.length;
    index++
  ) {
    stableDebtTokenAddressesBalances[index].amount =
      stableDebtTokenAddressesBalances[index].amount;
    stableDebtTokenAddressesBalances[index].category = "lending-borrowed";
    stableDebtTokenAddressesBalances[index].realToken =
      stableDebtTokenAddressesBalances[index];
    stableDebtTokenAddressesBalances[index].address =
      reserveTokens[index].underlyingTokenAddress;

    let aBalanceFormat = stableDebtTokenAddressesBalances[index];
    const aBalance: Balance = aBalanceFormat;
    balances.push(aBalance);
  }

  //fetch variable debt tokens
  let variableDebtTokenAddressesBalances = await getERC20Balances(
    ctx,
    ctx.chain,
    variableDebtTokenAddresses
  );

  for (
    let index = 0;
    index < variableDebtTokenAddressesBalances.length;
    index++
  ) {
    variableDebtTokenAddressesBalances[index].amount =
      variableDebtTokenAddressesBalances[index].amount;
    variableDebtTokenAddressesBalances[index].category =
      "lending-borrowed-variable";
    variableDebtTokenAddressesBalances[index].realToken =
      variableDebtTokenAddressesBalances[index];
    variableDebtTokenAddressesBalances[index].address =
      reserveTokens[index].underlyingTokenAddress;

    let aBalanceFormat = variableDebtTokenAddressesBalances[index];
    const aBalance: Balance = aBalanceFormat;
    balances.push(aBalance);
  }

  return balances;
}
