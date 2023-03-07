import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { BN_ZERO, isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers/lib/ethers'
import { groupBy } from 'lodash'

import { aaveBalancesProvider } from '../providers/aave'
import { arrakisBalancesProvider } from '../providers/arrakis'
import { convexBalancesProvider } from '../providers/convex'
import { fraxpoolBalancesProvider } from '../providers/fraxpool'
import { ProviderBalancesParams } from '../providers/interface'
import { uniswapBalancesProvider } from '../providers/uniswap'
import { uniswap3BalancesProvider } from '../providers/uniswap3'
import { uniswapNFTBalancesProvider } from '../providers/uniswapNFT'

const abi = {
  lockedLiquidityOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'lockedLiquidityOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256[]', name: 'new_earned', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getFraxBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = pools.map((pool) => ({ target: pool.stakeAddress, params: [ctx.address] }))

  const [balancesOfsRes, earnedsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.lockedLiquidityOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  pools.forEach((pool, poolIdx) => {
    const rewards = pool.rewards
    const balanceOfRes = balancesOfsRes[poolIdx]

    if (!rewards || !isSuccess(balanceOfRes) || isZero(balanceOfRes.output)) {
      return
    }

    rewards.forEach((reward, idx) => {
      ;(reward as Balance).amount = isSuccess(earnedsRes[poolIdx])
        ? BigNumber.from(earnedsRes[poolIdx].output[idx])
        : BN_ZERO
    })

    balances.push({
      ...pool,
      amount: BigNumber.from(balanceOfRes.output),
      rewards: rewards as Balance[],
      underlyings: pool.underlyings as Contract[],
      category: 'farm',
    })
  })

  return underlyingsFraxBalances(ctx, balances)
}

type Provider = (ctx: BalancesContext, pools: ProviderBalancesParams[]) => Promise<ProviderBalancesParams[]>

const providers: Record<string, Provider | undefined> = {
  aave: aaveBalancesProvider,
  curve: convexBalancesProvider,
  convex: convexBalancesProvider,
  arrakis: arrakisBalancesProvider,
  uniswap: uniswapBalancesProvider,
  uniswap3: uniswap3BalancesProvider,
  uniswapNFT: uniswapNFTBalancesProvider,
  stakedao: convexBalancesProvider,
  fraxpool: fraxpoolBalancesProvider,
}

const underlyingsFraxBalances = async (ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> => {
  // resolve underlyings
  const poolsByProvider = groupBy(pools, 'provider')

  return (
    await Promise.all(
      Object.keys(poolsByProvider).map((providerId) => {
        const providerFn = providers[providerId]
        if (!providerFn) {
          return poolsByProvider[providerId] as Balance[]
        }

        return providerFn(ctx, poolsByProvider[providerId] as ProviderBalancesParams[])
      }),
    )
  ).flat()
}
