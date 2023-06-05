import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'depositAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'adjustedAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'claimable', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  claimableReward: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'address[]', name: '_tokens', type: 'address[]' },
    ],
    name: 'claimableReward',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'balances',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3201,
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const EPX: Token = {
  chain: 'bsc',
  address: '0xaf41054c1487b0e5e2b9250c0332ecbce6ce9d71',
  decimals: 18,
  symbol: 'EPX',
}

export async function getEllipsisFarmingBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterchef: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, userPendingsRewardsRes, totalSuppliesRes, tokenBalancesOfRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: masterchef.address, params: [pool.lpToken, ctx.address] } as const)),
      abi: abi.userInfo,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: masterchef.address, params: [ctx.address, [pool.lpToken]] } as const)),
      abi: abi.claimableReward,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address } as const)), abi: abi.totalSupply }),
    multicall({
      ctx,
      calls: pools.flatMap((pool) =>
        range(0, pool.tokens.length).map((_, idx) => ({ target: pool.pool, params: [BigInt(idx)] } as const)),
      ),
      abi: abi.balances,
    }),
  ])

  let balanceOfIdx = 0

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const underlyings = pools[poolIdx].tokens
    const userPendingRewardsRes = userPendingsRewardsRes[poolIdx]
    const userBalancesOfRes = userBalancesRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (
      !underlyings ||
      !userBalancesOfRes.success ||
      !userPendingRewardsRes.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output == 0n
    ) {
      balanceOfIdx += underlyings.length
      continue
    }

    const poolBalance: Balance = {
      ...pools[poolIdx],
      amount: userBalancesOfRes.output[0],
      category: 'farm',
      underlyings: [],
      rewards: [{ ...EPX, amount: userPendingRewardsRes.output[0] }],
    }

    for (let underlyingIdx = 0; underlyingIdx < underlyings.length; underlyingIdx++) {
      const underlyingBalanceRes = tokenBalancesOfRes[balanceOfIdx]

      const underlyingBalance: bigint = underlyingBalanceRes.success ? underlyingBalanceRes.output : 0n

      const underlyingAmount = (underlyingBalance * poolBalance.amount) / totalSupplyRes.output

      poolBalance.underlyings!.push({
        ...underlyings[underlyingIdx],
        address: underlyings[underlyingIdx].erc20address,
        amount: underlyingAmount,
        chain: ctx.chain,
      })

      balanceOfIdx++
    }

    balances.push(poolBalance)
  }

  return balances
}
