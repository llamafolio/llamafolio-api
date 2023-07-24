import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  accountSnapshot: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'accountSnapshot',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  allClaimable: {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'contract ERC20', name: 'reward', type: 'address' },
    ],
    name: 'allClaimable',
    outputs: [{ internalType: 'uint256', name: 'unclaimedRewards', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const OP: Token = {
  chain: 'optimism',
  address: '0x4200000000000000000000000000000000000042',
  decimals: 18,
  symbol: 'OP',
}

export async function getExactlyBalances(ctx: BalancesContext, pools: Contract[]) {
  const userInfos = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: abi.accountSnapshot,
  })

  return mapSuccessFilter(userInfos, (res, idx) => {
    const pool = pools[idx]
    const [lend, borrow] = res.output

    const lendPool: Balance = {
      ...pool,
      amount: lend,
      underlyings: undefined,
      rewards: undefined,
      category: 'lend',
    }

    const borrowPool: Balance = {
      ...pool,
      amount: borrow,
      underlyings: undefined,
      rewards: undefined,
      category: 'borrow',
    }

    return [lendPool, borrowPool]
  })
}

export async function getExactlyIncentive(ctx: BalancesContext, rewardPool: Contract): Promise<Balance> {
  const userReward = await call({
    ctx,
    target: rewardPool.address,
    params: [ctx.address, OP.address],
    abi: abi.allClaimable,
  })

  return {
    ...rewardPool,
    amount: userReward,
    underlyings: [OP],
    rewards: undefined,
    category: 'reward',
  }
}
