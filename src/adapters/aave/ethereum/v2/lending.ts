import { providers } from "@defillama/sdk/build/general";
import { Balance, BalanceContext, Contract } from "../../../../lib/adapter";
import { getERC20Balances } from "../../../../lib/erc20";

import { getReserveTokens } from "./tokens";

export const lendingPoolContract: Contract = {
  name: "LendingPool",
  dName: "Geist Lending",
  chain: "ethereum",
  address: "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
};

export async function getLendingPoolBalances(ctx: BalanceContext) {
  const balances: Balance[] = [];
  const provider = providers["ethereum"];

  const reserveTokens = await getReserveTokens();
  const aTokens = reserveTokens.map(reserveToken => reserveToken.aTokenAddress);
  const stableDebtTokenAddresses = reserveTokens.map(reserveToken => reserveToken.stableDebtTokenAddress);
  const variableDebtTokenAddresses = reserveTokens.map(reserveToken => reserveToken.variableDebtTokenAddress);


  //fetch aTokens (supplied)
  let aBalances = await getERC20Balances(ctx, "ethereum", aTokens)

  for (let index = 0; index < aBalances.length; index++) {
    aBalances[index].amountFormatted = aBalances[index].amount.toString()
    aBalances[index].category = 'lending-supplied'
    //save the details of the real token
    aBalances[index].realToken = aBalances[index]
    //substitute the token for it's "native" version
    aBalances[index].address = reserveTokens[index].underlyingTokenAddress

    let aBalanceFormat = aBalances[index]
    const aBalance: Balance = aBalanceFormat
    balances.push(aBalance);
  }

  //fetch debt tokens

  let stableDebtTokenAddressesBalances = await getERC20Balances(ctx, "ethereum", stableDebtTokenAddresses)

  for (let index = 0; index < stableDebtTokenAddressesBalances.length; index++) {
    stableDebtTokenAddressesBalances[index].amountFormatted = stableDebtTokenAddressesBalances[index].amount.toString()
    stableDebtTokenAddressesBalances[index].category = 'lending-borrowed'
    stableDebtTokenAddressesBalances[index].realToken = stableDebtTokenAddressesBalances[index]
    stableDebtTokenAddressesBalances[index].address = reserveTokens[index].underlyingTokenAddress


    let aBalanceFormat = stableDebtTokenAddressesBalances[index]
    const aBalance: Balance = aBalanceFormat
    balances.push(aBalance);
  }


  //fetch variable debt tokens
  let variableDebtTokenAddressesBalances = await getERC20Balances(ctx, "ethereum", variableDebtTokenAddresses)

  for (let index = 0; index < variableDebtTokenAddressesBalances.length; index++) {
    variableDebtTokenAddressesBalances[index].amountFormatted = variableDebtTokenAddressesBalances[index].amount.toString()
    variableDebtTokenAddressesBalances[index].category = 'lending-borrowed-variable'
    variableDebtTokenAddressesBalances[index].realToken = variableDebtTokenAddressesBalances[index]
    variableDebtTokenAddressesBalances[index].address = reserveTokens[index].underlyingTokenAddress

    let aBalanceFormat = variableDebtTokenAddressesBalances[index]
    const aBalance: Balance = aBalanceFormat
    balances.push(aBalance);
  }


  return balances;
}
