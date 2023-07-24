import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  uni_token0: {
    inputs: [],
    name: 'uni_token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  uni_token1: {
    inputs: [],
    name: 'uni_token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  lp_pool: {
    inputs: [],
    name: 'lp_pool',
    outputs: [{ internalType: 'contract IUniswapV3Pool', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  liquidity: {
    inputs: [],
    name: 'liquidity',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

import type { ProviderBalancesParams } from './interface'

export const uniswap3Provider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const res: Contract[] = []

  const calls: Call<typeof abi.uni_token0>[] = pools.map((pool) => ({ target: pool.lpToken }))

  const [token0sRes, token1sRes, lpTokensRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.uni_token0 }),
    multicall({ ctx, calls, abi: abi.uni_token1 }),
    multicall({ ctx, calls, abi: abi.lp_pool }),
  ])

  pools.forEach((pool, idx) => {
    const token0Res = token0sRes[idx]
    const token1Res = token1sRes[idx]
    const lpTokenRes = lpTokensRes[idx]

    if (!token0Res.success || !token1Res.success || !lpTokenRes.success) {
      return
    }

    res.push({ ...pool, underlyings: [token0Res.output, token1Res.output], lpToken: lpTokenRes.output })
  })

  return res
}

export const uniswap3BalancesProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const underlyingsCalls: Call<typeof erc20Abi.balanceOf>[] = []
  const suppliesCalls: Call<typeof abi.liquidity>[] = []
  const rewardsCalls: Call<typeof abi.earned>[] = []

  for (const pool of pools) {
    const { underlyings, lpToken } = pool
    pool.symbol = `UNI-V3`

    if (!underlyings || !lpToken) {
      continue
    }

    underlyingsCalls.push(
      ...underlyings.map((underlying) => ({ target: underlying.address, params: [lpToken] }) as const),
    )
    suppliesCalls.push({ target: lpToken })
    if (pool.stakeAddress) {
      rewardsCalls.push({ target: pool.stakeAddress, params: [ctx.address] } as const)
    }
  }

  const [underlyingsBalancesRes, totalSuppliesRes, earnedsFXSRes] = await Promise.all([
    multicall({ ctx, calls: underlyingsCalls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: suppliesCalls, abi: abi.liquidity }),
    multicall({ ctx, calls: rewardsCalls, abi: abi.earned }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount } = pool
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const earnedFXSRes = earnedsFXSRes[poolIdx]

    if (!underlyings || !amount || !totalSupplyRes || totalSupplyRes.output === 0n || !earnedFXSRes.success) {
      continue
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingsBalanceRes = underlyingsBalancesRes[underlyingIdx]

      const underlyingsBalance = underlyingsBalanceRes.success ? underlyingsBalanceRes.output : 0n

      if (!totalSupplyRes.success || totalSupplyRes.output === 0n) {
        return
      }

      ;(underlying as Balance).amount = (underlyingsBalance * amount) / totalSupplyRes.output
      ;(pool.rewards?.[0] as Balance).amount = earnedFXSRes.output
    })
  }

  return pools
}
