import type { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  locks: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'locks',
    outputs: [
      { internalType: 'uint256', name: 'startTime', type: 'uint256' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'uint256', name: 'lockedAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'multiplier', type: 'uint256' },
      { internalType: 'uint256', name: 'claimed', type: 'uint256' },
      { internalType: 'uint256', name: 'maxPayout', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  claimableIncome: {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'claimableIncome',
    outputs: [
      { internalType: 'uint256', name: 'free', type: 'uint256' },
      { internalType: 'uint256', name: 'max', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const TNGBL: Token = {
  chain: 'polygon',
  address: '0x49e6A20f1BBdfEeC2a8222E052000BbB14EE6007',
  decimals: 18,
  symbol: 'TNGBL',
}

export async function getTangibleLockerBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const balances: LockBalance[] = []

  const balanceOfsRes = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })
  const balanceOf = Number(balanceOfsRes)

  const tokenOfOwnerByIndexesRes = await multicall({
    ctx,
    calls: range(0, balanceOf).map((idx) => ({ target: locker.address, params: [ctx.address, idx] })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const [lockedsRes, earnedsRes] = await Promise.all([
    multicall({
      ctx,
      calls: tokenOfOwnerByIndexesRes.map((tokenIdx) =>
        isSuccess(tokenIdx) ? { target: locker.address, params: [tokenIdx.output] } : null,
      ),
      abi: abi.locks,
    }),
    multicall({
      ctx,
      calls: tokenOfOwnerByIndexesRes.map((tokenIdx) =>
        isSuccess(tokenIdx) ? { target: locker.address, params: [tokenIdx.output] } : null,
      ),
      abi: abi.claimableIncome,
    }),
  ])

  for (let idx = 0; idx < balanceOf; idx++) {
    const lockedRes = lockedsRes[idx]
    const earnedRes = earnedsRes[idx]

    if (!isSuccess(lockedRes) || !isSuccess(earnedRes)) {
      continue
    }

    const now = Date.now() / 1000
    const unlockAt = lockedRes.output.endTime

    balances.push({
      ...locker,
      amount: BigNumber.from(lockedRes.output.lockedAmount),
      unlockAt,
      claimable: now > unlockAt ? BigNumber.from(lockedRes.output.lockedAmount) : BN_ZERO,
      underlyings: [TNGBL],
      rewards: [{ ...TNGBL, amount: BigNumber.from(earnedRes.output.free) }],
      category: 'lock',
    })
  }

  return balances
}
