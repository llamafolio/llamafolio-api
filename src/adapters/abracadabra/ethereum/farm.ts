import { getUnderlyingsPoolsBalances } from '@adapters/curve-dex/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'stakingToken', type: 'address' },
      { internalType: 'uint256', name: 'stakingTokenTotalAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'accIcePerShare', type: 'uint256' },
      { internalType: 'uint32', name: 'lastRewardTime', type: 'uint32' },
      { internalType: 'uint16', name: 'allocPoint', type: 'uint16' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'remainingIceTokenReward', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingIce: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingIce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const SPELL: Token = {
  chain: 'ethereum',
  address: '0x090185f2135308bad17527004364ebcc2d37e5f6',
  decimals: 18,
  symbol: 'SPELL',
}

const metaRegistry: Contract = {
  name: 'Curve Metaregistry',
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getFarmBalances(ctx: BalancesContext, pools: Contract[], contract: Contract): Promise<Balance[]> {
  const sushiPools: Balance[] = []
  const curvePools: Balance[] = []

  const calls: Call<typeof abi.userInfo>[] = pools.map((_, idx) => ({
    target: contract.address,
    params: [BigInt(idx), ctx.address],
  }))

  const [poolBalances, poolRewards] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingIce }),
  ])

  pools.forEach((pool, idx) => {
    const poolBalance = poolBalances[idx]
    const poolReward = poolRewards[idx]
    const underlyings = pool.underlyings as Contract[]

    if (!poolBalance.success || !underlyings || !poolReward.success) {
      return
    }

    const [amount] = poolBalance.output

    if (pool.provider === 'sushi') {
      sushiPools.push({
        ...pool,
        amount,
        underlyings,
        rewards: [{ ...SPELL, amount: poolReward.output }],
        category: 'farm',
      })
    }

    if (pool.provider === 'curve') {
      curvePools.push({
        ...pool,
        amount,
        underlyings,
        rewards: [{ ...SPELL, amount: poolReward.output }],
        category: 'farm',
      })
    }
  })

  const [sushiBalances, curveBalances] = await Promise.all([
    getUnderlyingBalances(ctx, sushiPools),
    getUnderlyingsPoolsBalances(ctx, curvePools, metaRegistry, true),
  ])

  return [...sushiBalances, ...curveBalances]
}
