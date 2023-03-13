import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'

const abi = {
  pricePerShare: {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getMetronomeBalances(ctx: BalancesContext, markets: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfsRes, pricePerSharesRes] = await Promise.all([
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address, params: [ctx.address] })),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.token })),
      abi: abi.pricePerShare,
    }),
  ])

  for (let marketIdx = 0; marketIdx < markets.length; marketIdx++) {
    const market = markets[marketIdx]
    const { underlyings, category } = market
    const balanceOfRes = balanceOfsRes[marketIdx]
    const pricePerShareRes = isSuccess(pricePerSharesRes[marketIdx])
      ? pricePerSharesRes[marketIdx].output
      : utils.parseEther('1.0')

    if (!isSuccess(balanceOfRes) || !pricePerShareRes) {
      continue
    }

    balances.push({
      ...market,
      amount: BigNumber.from(balanceOfRes.output).mul(pricePerShareRes).div(utils.parseEther('1.0')),
      underlyings: underlyings as Contract[],
      rewards: undefined,
      category,
    })
  }

  return balances
}
