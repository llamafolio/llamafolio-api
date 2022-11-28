import { Balance, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'

interface BalanceWithExtraProps extends Balance {
  tokens?: string[]
}

export async function getLpPoolsBalances(ctx: BaseContext, chain: Chain, lpPools: Contract[]) {
  const balances: Balance[] = []

  const nonZeroPoolsBalances: BalanceWithExtraProps[] = (
    await getERC20BalanceOf(ctx, chain, lpPools as Token[])
  ).filter((res) => res.amount.gt(0))

  for (let i = 0; i < nonZeroPoolsBalances.length; i++) {
    const pool = nonZeroPoolsBalances[i]
    const underlyings = pool.underlyings as any[]

    if (underlyings) {
      const [getTotalSupply, getUnderlyingsBalances] = await Promise.all([
        call({
          chain,
          target: pool.address,
          params: [],
          abi: {
            stateMutability: 'view',
            type: 'function',
            name: 'totalSupply',
            inputs: [],
            outputs: [{ name: '', type: 'uint256' }],
            gas: 3408,
          },
        }),

        multicall({
          chain,
          calls: range(0, underlyings.length).map((i) => ({
            target: pool.address,
            params: [i],
          })),
          abi: {
            stateMutability: 'view',
            type: 'function',
            name: 'balances',
            inputs: [{ name: 'arg0', type: 'uint256' }],
            outputs: [{ name: '', type: 'uint256' }],
            gas: 3153,
          },
        }),
      ])

      const totalSupply = getTotalSupply.output
      const underlyingsBalances = getUnderlyingsBalances.filter((res) => res.success).map((res) => res.output)

      const formattedUnderlyings: any = underlyings.map((underlying, x) => ({
        ...underlying,
        amount: underlying.decimals && pool.amount.mul(underlyingsBalances[x]).div(totalSupply),
        decimals: underlying.decimals,
      }))

      balances.push({
        chain,
        address: pool.address,
        amount: pool.amount,
        decimals: pool.decimals,
        symbol: underlyings.map((coin: Token) => coin.symbol).join('-'),
        underlyings: formattedUnderlyings,
        category: 'lp',
      })
    }
    return balances
  }
}
