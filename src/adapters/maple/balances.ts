import { getERC20Balances, getERC20Details } from '@lib/erc20'
import { BigNumber } from 'ethers'

export async function getStakeBalances(ctx, chain, contracts) {
  const balances = []

  const erc20 = []
  const underlyings = []
  for (let d = 0; d < contracts.length; d++) {
    const contract = contracts[d]
    erc20.push(contract.address)
    underlyings.push(contract.underlyingTokens)
  }

  const balancesDetails = await getERC20Balances(ctx, chain, erc20)
  const underlyingDetails = await getERC20Details(chain, underlyings)

  for (let index = 0; index < balancesDetails.length; index++) {
    const balanceRow = balancesDetails[index]
    balances.push({
      chain,
      category: 'stake',
      symbol: underlyingDetails[index].symbol,
      decimals: 18,
      address: balanceRow.address,
      priceSubstitute: contracts[index].underlyingTokens,
      amount: BigNumber.from(balanceRow.amount),
      yieldKey: erc20[index],
    })
  }

  //can we get MPL rewards??

  return balances
}
