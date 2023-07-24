import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  balances: {
    name: 'balances',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'int128', name: 'arg0' }],
    constant: true,
    payable: false,
    type: 'function',
  },
} as const

export async function getBeltLpBalances(ctx: BalancesContext, lps: Contract[]) {
  lps = lps.filter((lp) => lp.beltLP === true)

  const userBalancesRes = await multicall({
    ctx,
    calls: lps.map((lp) => ({ target: lp.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const balances: Balance[] = mapSuccessFilter(userBalancesRes, (res, idx) => {
    const underlyings = lps[idx].underlyings as Contract[]

    return {
      ...lps[idx],
      amount: res.output,
      underlyings,
      rewards: undefined,
      category: 'lp',
    }
  })

  return getFourBeltUnderlyingsBalances(ctx, balances)
}

export const getFourBeltUnderlyingsBalances = async (ctx: BalancesContext, poolBalances: Balance[]) => {
  const balances: Balance[] = []

  const [underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: poolBalances.flatMap((poolBalance: Contract) =>
        range(0, 4).map((idx) => ({ target: poolBalance.pool, params: [idx] }) as const),
      ),
      abi: abi.balances,
    }),
    multicall({
      ctx,
      calls: poolBalances.map((poolBalance: Contract) => ({ target: poolBalance.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  let underlyingIdx = 0
  for (let lpIdx = 0; lpIdx < poolBalances.length; lpIdx++) {
    const poolBalance = poolBalances[lpIdx]
    const userBalance = poolBalance.amount
    const underlyings = poolBalance.underlyings as Balance[]
    const rewards = poolBalance.rewards as Balance[]
    const totalSupplyRes = totalSuppliesRes[lpIdx]

    if (!underlyings || !userBalance || !totalSupplyRes.success || totalSupplyRes.output === 0n) {
      // next lp
      underlyingIdx += 4
      continue
    }

    underlyings.forEach((underlying) => {
      underlying.amount = (userBalance * (underlyingsBalancesRes[underlyingIdx].output as any)) / totalSupplyRes.output

      underlyingIdx++
    })

    balances.push({ ...poolBalance, amount: userBalance, underlyings, rewards, category: poolBalance.category })
  }

  return balances
}
