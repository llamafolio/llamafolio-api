import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getMasterChefPoolsInfos } from '@lib/masterchef/masterchef'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardLockedUp', type: 'uint256' },
      { internalType: 'uint256', name: 'nextHarvestUntil', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingTokens: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingTokens',
    outputs: [
      { internalType: 'address[]', name: 'addresses', type: 'address[]' },
      { internalType: 'string[]', name: 'symbols', type: 'string[]' },
      { internalType: 'uint256[]', name: 'decimals', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ALB: Token = {
  chain: 'base',
  address: '0x1dd2d631c92b1acdfcdd51a0f7145a50130050c4',
  decimals: 18,
  symbol: 'ALB',
}

const ALBsingleFarmer: Contract = {
  chain: 'base',
  address: '0x1dd2d631c92b1aCdFCDd51A0F7145A50130050C4',
  pid: 0,
}

export async function getAlienFarmBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
): Promise<Balance[]> {
  const poolsBalances: Balance[] = []

  const pools = [...(await getMasterChefPoolsInfos(ctx, pairs, masterchef)), ALBsingleFarmer]
  if (!pools) return []

  const calls: Call<typeof abi.userInfo>[] = []
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    calls.push({ target: masterchef.address, params: [pools[poolIdx].pid, ctx.address] })
  }

  const [poolsBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingTokens }),
  ])

  for (const [index, pool] of pools.entries()) {
    const underlyings = pool.underlyings as Contract[]
    const poolsBalanceRes = poolsBalancesRes[index]
    const pendingRewardRes = pendingRewardsRes[index]

    if (!poolsBalanceRes.success || !pendingRewardRes.success) {
      continue
    }

    poolsBalances.push({
      ...pool,
      underlyings,
      category: 'farm',
      amount: poolsBalanceRes.output[0],
      rewards: [{ ...ALB, amount: pendingRewardRes.output[3][0] }],
    })
  }

  const fmtPoolsBalances = await getUnderlyingBalances(ctx, poolsBalances)

  for (let i = 0; i < fmtPoolsBalances.length; i++) {
    const contractIndex = poolsBalances.findIndex((c) => c.address === fmtPoolsBalances[i].address)
    if (contractIndex !== -1) {
      poolsBalances[contractIndex] = Object.assign({}, poolsBalances[contractIndex], fmtPoolsBalances[i])
    }
  }

  return poolsBalances
}
