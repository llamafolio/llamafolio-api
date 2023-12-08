import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: '_owner', type: 'address' },
      { internalType: 'uint256', name: '_tokenIndex', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  lockedDerivedAmount: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lockedDerivedAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  lockedEnd: {
    inputs: [{ internalType: 'uint256', name: '_tokenId', type: 'uint256' }],
    name: 'lockedEnd',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const vault: Contract = {
  chain: 'polygon',
  address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
}

export async function getTetuLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const userTokenLength = await call({ ctx, target: locker.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const userTokenIds = await multicall({
    ctx,
    calls: rangeBI(0n, userTokenLength).map((i) => ({ target: locker.address, params: [ctx.address, i] }) as const),
    abi: abi.tokenOfOwnerByIndex,
  })

  const [tokenBalances, tokensLockedEnd] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(userTokenIds, (res) => ({ target: res.input.target, params: [res.output] }) as const),
      abi: abi.lockedDerivedAmount,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(userTokenIds, (res) => ({ target: res.input.target, params: [res.output] }) as const),
      abi: abi.lockedEnd,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    tokenBalances.map((_, i) => [tokenBalances[i], tokensLockedEnd[i]]),

    (res) => {
      const underlyings = locker.underlyings as Contract[]
      const now = Date.now() / 1000
      const [{ output: balance }, { output: lockEnd }] = res.inputOutputPairs
      const unlockAt = Number(lockEnd)

      return {
        ...locker,
        amount: balance,
        unlockAt,
        claimable: now > unlockAt ? balance : 0n,
        underlyings,
        rewards: undefined,
        category: 'lock' as Category,
      }
    },
  )

  return getUnderlyingsBalancesFromBalancer(ctx, poolBalances as IBalancerBalance[], vault, {
    getAddress: (balance: Balance) => balance.token!,
    getCategory: (balance: Balance) => balance.category,
  })
}
