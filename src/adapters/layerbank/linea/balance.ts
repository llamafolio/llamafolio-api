import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { ADDRESS_ZERO } from '@lib/contract'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  exchangeRate: {
    inputs: [],
    name: 'exchangeRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  borrowBalanceOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'borrowBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLayerBankMarketsBalances(ctx: BalancesContext, markets: Contract[]) {
  const balances: Balance[] = []

  const [cTokensBalances, cTokensBorrowBalanceCurrentRes, cTokensExchangeRateCurrentRes] = await Promise.all([
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address, params: [ctx.address] }) as const),
      abi: abi.borrowBalanceOf,
    }),
    multicall({
      ctx,
      calls: markets.map((market) => ({ target: market.address })),
      abi: abi.exchangeRate,
    }),
  ])

  markets.forEach((market, i) => {
    if (!market.underlyings?.length) return

    const underlying = market.underlyings[0] as Contract

    if (underlying.address === ADDRESS_ZERO) {
      underlying.chain = ctx.chain
      underlying.address = '0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f'
    }

    const rewards = market.rewards as Balance[]
    const cDecimals = 8 // cDecimals sont toujours 8
    const uDecimals = underlying.decimals

    if (!uDecimals) return

    const lendRes = cTokensBalances[i]
    const borrowRes = cTokensBorrowBalanceCurrentRes[i]
    const pricePerFullShareRes = cTokensExchangeRateCurrentRes[i]

    if (lendRes.success && pricePerFullShareRes.success) {
      const fmtPricePerFullShare = pricePerFullShareRes.output / 10n ** BigInt(cDecimals + 2)
      const cTokenAmount = lendRes.output * fmtPricePerFullShare

      balances.push({
        ...market,
        amount: cTokenAmount,
        underlyings: [{ ...underlying, amount: cTokenAmount / 10n ** BigInt(cDecimals) }],
        rewards,
        category: 'lend',
      })
    }

    if (borrowRes.success) {
      balances.push({
        ...underlying,
        amount: borrowRes.output,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      })
    }
  })

  return balances
}
