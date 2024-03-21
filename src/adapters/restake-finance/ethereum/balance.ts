import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  sharesOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'sharesOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  sharesToBalance: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'sharesToBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserLocks: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getUserLocks',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'until', type: 'uint256' },
          { internalType: 'uint256', name: 'lastBonus', type: 'uint256' },
        ],
        internalType: 'struct IDAOV2Staking.Lock[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const RSTK: Contract = {
  chain: 'ethereum',
  address: '0x12eF10A4fc6e1Ea44B4ca9508760fF51c647BB71',
  decimals: 18,
  symbol: 'RSTK',
}

export async function getRestakeFinanceStakes(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const userShares = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] as const })),
    abi: abi.sharesOf,
  })

  const userAssets = await multicall({
    ctx,
    calls: mapSuccessFilter(userShares, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.sharesToBalance,
  })

  return mapSuccessFilter(userAssets, (res, index) => {
    return {
      ...stakers[index],
      amount: res.input.params![0],
      underlyings: [{ ...(stakers[index].underlyings![0] as Contract), amount: res.output }],
      rewards: undefined,
      category: 'stake',
    }
  })
}

export async function getRestakeLockBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const userLockBalances = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.getUserLocks })

  return userLockBalances.map((lockBalance) => {
    const now = Date.now() / 1000
    const { amount, until, lastBonus } = lockBalance
    const unlockAt = Number(until)

    return {
      ...locker,
      amount,
      claimable: now > unlockAt ? amount : 0n,
      unlockAt,
      underlyings: undefined,
      rewards: [{ ...RSTK, amount: lastBonus }],
      category: 'lock',
    }
  })
}
