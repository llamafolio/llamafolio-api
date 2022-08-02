import BN from "bignumber.js";
import { ethers } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { Balance, BalanceContext, Contract } from "../../lib/adapter";
import { getERC20Balances } from "../../lib/erc20";

import LendingPoolABI from "./abis/LendingPool.json";
import DataProviderABI from "./abis/DataProvider.json";


async function getaTokens() {



}


export const lendingPoolContract: Contract = {
  name: "LendingPool",
  chain: "fantom",
  address: "0x9FAD24f572045c7869117160A571B2e50b10d068",
};

export async function getLendingPoolBalances(ctx: BalanceContext) {
  const balances: Balance[] = [];
  const provider = providers["fantom"];

  const lendingPool = new ethers.Contract(
    "0x9FAD24f572045c7869117160A571B2e50b10d068",
    LendingPoolABI,
    provider
  );

  const lendingToken = await lendingPool.getReservesList()


  const dataProvider = new ethers.Contract(
    "0xf3B0611e2E4D2cd6aB4bb3e01aDe211c3f42A8C3",
    DataProviderABI,
    provider
  );

  //use multicall
  let aTokens = []
  let stableDebtTokenAddresses = []
  let variableDebtTokenAddresses = []

  for (let index = 0; index < lendingToken.length; index++) {
    const tokenInfo = await dataProvider.getReserveTokensAddresses(lendingToken[index])
    aTokens.push(tokenInfo.aTokenAddress)
    aTokens.push(tokenInfo.stableDebtTokenAddress)
    aTokens.push(tokenInfo.variableDebtTokenAddress)
  }


  //fetch aTokens (supplied)
  let aBalances = await getERC20Balances(ctx, "fantom", aTokens)

  for (let index = 0; index < aBalances.length; index++) {
    aBalances[index].amountFormatted = aBalances[index].amount.toString()
    aBalances[index].category = 'lending-supplied'
    let aBalanceFormat = aBalances[index]
    const aBalance: Balance = aBalanceFormat
    balances.push(aBalance);
  }

  //fetch debt tokens

  let stableDebtTokenAddressesBalances = await getERC20Balances(ctx, "fantom", stableDebtTokenAddresses)

  for (let index = 0; index < stableDebtTokenAddressesBalances.length; index++) {
    stableDebtTokenAddressesBalances[index].amountFormatted = stableDebtTokenAddressesBalances[index].amount.toString()
    stableDebtTokenAddressesBalances[index].category = 'lending-borrowed'
    let aBalanceFormat = stableDebtTokenAddressesBalances[index]
    const aBalance: Balance = aBalanceFormat
    balances.push(aBalance);
  }


  //fetch variable debt tokens
  let variableDebtTokenAddressesBalances = await getERC20Balances(ctx, "fantom", variableDebtTokenAddresses)

  for (let index = 0; index < variableDebtTokenAddressesBalances.length; index++) {
    variableDebtTokenAddressesBalances[index].amountFormatted = variableDebtTokenAddressesBalances[index].amount.toString()
    variableDebtTokenAddressesBalances[index].category = 'lending-borrowed-variable'
    let aBalanceFormat = variableDebtTokenAddressesBalances[index]
    const aBalance: Balance = aBalanceFormat
    balances.push(aBalance);
  }


  return balances;
}
