import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO, isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
}

import { ProviderBalancesParams } from './interface'

export const uniswap3Provider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const res: Contract[] = []

  const calls: Call[] = pools.map((pool) => ({ target: pool.lpToken }))

  const [token0sRes, token1sRes, lpTokensRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.uni_token0 }),
    multicall({ ctx, calls, abi: abi.uni_token1 }),
    multicall({ ctx, calls, abi: abi.lp_pool }),
  ])

  pools.forEach((pool, idx) => {
    const token0Res = token0sRes[idx]
    const token1Res = token1sRes[idx]
    const lpTokenRes = lpTokensRes[idx]

    if (!isSuccess(token0Res) || !isSuccess(token1Res) || !isSuccess(lpTokenRes)) {
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
  const underlyingsCalls: Call[] = []
  const suppliesCalls: Call[] = []
  const rewardsCalls: Call[] = []

  for (const pool of pools) {
    const { underlyings, lpToken } = pool
    pool.symbol = `UNI-V3`

    if (!underlyings || !lpToken) {
      continue
    }

    underlyingsCalls.push(...underlyings.map((underlying) => ({ target: underlying.address, params: [lpToken] })))
    suppliesCalls.push({ target: lpToken })
    rewardsCalls.push({ target: pool.stakeAddress, params: [ctx.address] })
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

    if (!underlyings || !amount || !totalSupplyRes || isZero(totalSupplyRes.output) || !isSuccess(earnedFXSRes)) {
      continue
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingsBalanceRes = underlyingsBalancesRes[underlyingIdx]

      const underlyingsBalance = isSuccess(underlyingsBalanceRes)
        ? BigNumber.from(underlyingsBalanceRes.output)
        : BN_ZERO

      ;(underlying as Balance).amount = underlyingsBalance.mul(amount).div(totalSupplyRes.output)
      ;(pool.rewards?.[0] as Balance).amount = BigNumber.from(earnedFXSRes.output)
    })
  }

  return pools
}
