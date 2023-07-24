import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  stakeOf: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'stakeOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalStaked: {
    inputs: [],
    name: 'totalStaked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  staked: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'staked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingApx: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingApx',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getApolloStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance | undefined> {
  const underlyings = staker.underlyings as Contract[]
  if (!underlyings) {
    return
  }

  const [balanceOf, totalSupply, underlyingsBalancesRes] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.stakeOf }),
    call({ ctx, target: staker.address, abi: abi.totalStaked }),
    multicall({
      ctx,
      calls: underlyings.map((underlying) => ({ target: underlying.address, params: [staker.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
  ])

  const fmtUnderlyings = mapSuccessFilter(underlyingsBalancesRes, (res, idx) => {
    return {
      ...underlyings[idx],
      amount: (res.output * balanceOf) / totalSupply,
    }
  })

  return {
    ...staker,
    amount: balanceOf,
    underlyings: fmtUnderlyings,
    rewards: undefined,
    category: 'stake',
  }
}

export async function getApolloFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []
  const calls: Call<typeof abi.staked>[] = farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }))

  const [userBalanceOfsRes, userPendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.staked }),
    multicall({ ctx, calls, abi: abi.pendingApx }),
  ])

  for (let farmerIdx = 0; farmerIdx < farmers.length; farmerIdx++) {
    const farmer = farmers[farmerIdx]
    const underlyings = farmer.underlyings as Contract[]
    const reward = farmer.rewards?.[0] as Contract
    const userBalanceOfRes = userBalanceOfsRes[farmerIdx]
    const userPendingRewardRes = userPendingRewardsRes[farmerIdx]

    if (!userBalanceOfRes.success || !userPendingRewardRes.success) {
      continue
    }

    balances.push({
      ...farmer,
      address: farmer.token as `0x${string}`,
      amount: userBalanceOfRes.output,
      underlyings,
      rewards: [{ ...reward, amount: userPendingRewardRes.output }],
      category: 'farm',
    })
  }

  return getUnderlyingBalances(ctx, balances)
}
