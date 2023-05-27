import { balancerProvider } from '@adapters/piedao/ethereum/providers/balancer'
import { pieProvider } from '@adapters/piedao/ethereum/providers/pie'
import { sushiProvider } from '@adapters/piedao/ethereum/providers/sushi'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { groupBy } from '@lib/array'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  getStakeTotalDeposited: {
    inputs: [
      { internalType: 'address', name: '_account', type: 'address' },
      { internalType: 'uint256', name: '_poolId', type: 'uint256' },
    ],
    name: 'getStakeTotalDeposited',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getStakeTotalUnclaimed: {
    inputs: [
      { internalType: 'address', name: '_account', type: 'address' },
      { internalType: 'uint256', name: '_poolId', type: 'uint256' },
    ],
    name: 'getStakeTotalUnclaimed',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const DOUGH: Token = {
  chain: 'ethereum',
  address: '0xad32A8e6220741182940c5aBF610bDE99E737b2D',
  decimals: 18,
  symbol: 'DOUGH',
}

export async function getPieDaoFarmBalances(
  ctx: BalancesContext,
  pools: Contract[],
  farmer: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof abi.getStakeTotalDeposited>[] = pools.map((pool) => ({
    target: farmer.address,
    params: [ctx.address, pool.pid],
  }))
  const [userBalancesRes, userPendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getStakeTotalDeposited }),
    multicall({ ctx, calls, abi: abi.getStakeTotalUnclaimed }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const userBalanceRes = userBalancesRes[poolIdx]
    const userPendingRewardRes = userPendingRewardsRes[poolIdx]

    if (!userBalanceRes.success || !userPendingRewardRes.success) {
      continue
    }

    balances.push({
      ...pool,
      amount: BigNumber.from(userBalanceRes.output),
      underlyings,
      rewards: [{ ...DOUGH, amount: BigNumber.from(userPendingRewardRes.output) }],
      category: 'farm',
    })
  }

  return getUnderlyingsPieDaoBalances(ctx, balances)
}

type Provider = (ctx: BalancesContext, pools: Balance[]) => Promise<Balance[]>

const providers: Record<string, Provider | undefined> = {
  sushi: sushiProvider,
  balancer: balancerProvider,
  pie: pieProvider,
}

const getUnderlyingsPieDaoBalances = async (ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> => {
  // resolve underlyings
  const poolsByProvider = groupBy(pools, 'provider')

  return (
    await Promise.all(
      Object.keys(poolsByProvider).map((providerId) => {
        const providerFn = providers[providerId]
        if (!providerFn) {
          return poolsByProvider[providerId] as Balance[]
        }

        return providerFn(ctx, poolsByProvider[providerId] as Balance[])
      }),
    )
  ).flat()
}
