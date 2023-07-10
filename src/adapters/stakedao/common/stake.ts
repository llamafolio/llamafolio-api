import { getUnderlyingsPoolsBalances } from '@adapters/curve-dex/common/balance'
import type { Balance, BalancesContext, Contract, StakeBalance } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

interface StakeDaoStakingBalancesParams extends StakeBalance {
  lpToken?: `0x${string}`
}

const metaRegistry: Contract = {
  name: 'Curve Metaregistry',
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

const SDT: Token = {
  chain: 'ethereum',
  address: '0x73968b9a57c6E53d41345FD57a6E6ae27d6CDB2F',
  decimals: 18,
  symbol: 'SDT',
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

export async function getStakeDaoXSDTBalance(ctx: BalancesContext, pool: Contract): Promise<Balance> {
  const [userBalance, totalSupply, balanceOf] = await Promise.all([
    getSingleStakeBalance(ctx, pool),
    call({ ctx, target: pool.address, abi: erc20Abi.totalSupply }),
    call({ ctx, target: SDT.address, params: [pool.address], abi: erc20Abi.balanceOf }),
  ])

  return {
    ...userBalance,
    amount: balanceOf,
    underlyings: [{ ...SDT, amount: (balanceOf * userBalance.amount) / totalSupply }],
    rewards: undefined,
    category: 'stake',
  }
}
