import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  userLocks: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userLocks',
    outputs: [{ internalType: 'uint256', name: 'totalAmountLocked', type: 'uint256' }],
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

const GIV: Contract = {
  chain: 'gnosis',
  address: '0x4f4f9b8d5b4d0dc10506e5551b0513b61fd59e75',
  decimals: 18,
  symbol: 'GIV',
}

export async function getGivethStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userLocks, earned] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.userLocks }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.earned }),
  ])

  return {
    ...staker,
    amount: userLocks,
    underlyings: undefined,
    rewards: [{ ...GIV, amount: earned }],
    category: 'stake',
  }
}

export async function getGivethFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalances, earnedsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  const poolBalances: Balance[] = mapSuccessFilter(userBalances, (res, index) => {
    const pool = pools[index]
    const underlyings = pool.underlyings as Contract[]
    const reward = pool.rewards?.[0] as Balance
    const rewardBalance: any = earnedsRes[index].success ? earnedsRes[index].output : 0n

    const rewards = [{ ...reward, amount: rewardBalance }]

    return {
      ...pool,
      amount: res.output,
      underlyings,
      rewards,
      category: 'farm',
    }
  })

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}
