import { getUnderlyingsPoolsBalances } from '@adapters/curve-dex/common/balance'
import type { Balance, BalancesContext, Contract, StakeBalance } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

interface StakeDaoStakingBalancesParams extends StakeBalance {
  lpToken?: `0x${string}`
}

const metaRegistry: Contract = {
  name: 'Curve Metaregistry',
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getStakeDaoStakingBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const curveBalances: StakeDaoStakingBalancesParams[] = []

  const userBalancesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.sdToken, params: [ctx.address] } as const)),
    abi: erc20Abi.balanceOf,
  })

  const balances: StakeDaoStakingBalancesParams[] = mapSuccessFilter(userBalancesRes, (res, idx) => {
    const balance: StakeDaoStakingBalancesParams = {
      ...pools[idx],
      amount: res.output,
      lpToken: pools[idx].token!,
      underlyings: pools[idx].underlyings as Contract[],
      rewards: undefined,
      category: 'stake',
    }

    if (pools[idx].provider === 'curve') {
      curveBalances.push(balance)
      return null
    }

    return balance
  }).filter(isNotNullish)

  const fmtCurveBalances: Balance[] = await getFormattedCurveBalances(ctx, curveBalances)

  return [...balances, ...fmtCurveBalances]
}

async function getFormattedCurveBalances(
  ctx: BalancesContext,
  curveBalances: StakeDaoStakingBalancesParams[],
): Promise<Balance[]> {
  const formattedBalances: Balance[] = await getUnderlyingsPoolsBalances(ctx, curveBalances, metaRegistry)

  return formattedBalances.map((balance) => ({
    ...balance,
    category: 'stake',
  }))
}
