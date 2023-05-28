import type { Balance, BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'

import { mapSuccess, range } from './array'
import { abi as erc20Abi } from './erc20'
import { sumBI } from './math'
import { multicall } from './multicall'

const abi = {
  locks: {
    stateMutability: 'view',
    type: 'function',
    name: 'locked',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [
      { name: 'amount', type: 'int128' },
      { name: 'end', type: 'uint256' },
    ],
    gas: 5653,
  },
  claimableRewards: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimableRewards',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        internalType: 'struct AuraLocker.EarnedData[]',
        name: 'userRewards',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  lockedBalances: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'lockedBalances',
    outputs: [
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      { internalType: 'uint256', name: 'unlockable', type: 'uint256' },
      { internalType: 'uint256', name: 'locked', type: 'uint256' },
      {
        components: [
          { internalType: 'uint112', name: 'amount', type: 'uint112' },
          { internalType: 'uint32', name: 'unlockTime', type: 'uint32' },
        ],
        internalType: 'struct AuraLocker.LockedBalance[]',
        name: 'lockData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
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
  nftLocked: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'nftLocked',
    outputs: [
      { internalType: 'int256', name: 'amount', type: 'int256' },
      { internalType: 'uint256', name: 'end', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

function getLockerAbi(methodName?: string): any {
  return JSON.parse(JSON.stringify(abi.locks).replace(abi.locks.name, methodName ? `${methodName}` : abi.locks.name))
}

function getNFTLockerAbi(methodName?: string): any {
  return JSON.parse(
    JSON.stringify(abi.nftLocked).replace(abi.nftLocked.name, methodName ? `${methodName}` : abi.nftLocked.name),
  )
}

export async function getSingleLockerBalance(
  ctx: BalancesContext,
  locker: Contract,
  underlying: Token | Contract,
  methodName: string,
): Promise<LockBalance> {
  const genericLocker = getLockerAbi(methodName)

  const [amount, end] = (await call({ ctx, target: locker.address, params: [ctx.address], abi: genericLocker })) as [
    bigint,
    bigint,
  ]

  const now = Date.now() / 1000
  const unlockAt = Number(end)

  return {
    ...locker,
    amount,
    underlyings: [underlying],
    claimable: now > unlockAt ? amount : 0n,
    unlockAt,
    rewards: undefined,
    category: 'lock',
  }
}

export async function getSingleLockerBalances(
  ctx: BalancesContext,
  lockers: Contract[],
  methodName: string,
): Promise<LockBalance[]> {
  const balances: LockBalance[] = []
  const genericLocker = getLockerAbi(methodName)

  const lockBalancesRes = await multicall({
    ctx,
    calls: lockers.map((locker) => ({ target: locker.address, params: [ctx.address] })),
    abi: genericLocker,
  })

  const now = Date.now() / 1000

  for (let lockerIdx = 0; lockerIdx < lockers.length; lockerIdx++) {
    const locker = lockers[lockerIdx]
    const underlyings = locker.underlyings as Contract[]
    const lockBalanceRes = lockBalancesRes[lockerIdx]

    if (!underlyings || !lockBalanceRes.success) {
      continue
    }

    const [amount, end] = lockBalanceRes.output as [bigint, bigint]
    const unlockAt = Number(end)

    balances.push({
      ...locker,
      amount,
      underlyings: underlyings,
      claimable: now > unlockAt ? amount : 0n,
      unlockAt,
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}

export async function getMultipleLockerBalances(
  ctx: BalancesContext,
  locker: Contract,
  underlying: Token | Contract,
  rewards?: Token[],
): Promise<LockBalance[]> {
  const balances: LockBalance[] = []

  const [lockedBalances, earnedRes] = await Promise.all([
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.lockedBalances }),
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.claimableRewards }),
  ])
  const [totalLocked, _unlockable, _locked, lockData] = lockedBalances

  const locked = sumBI((lockData || []).map((lockData) => lockData.amount))
  const expiredLocked = totalLocked - locked

  const claimableBalance: Balance = {
    ...locker,
    underlyings: [underlying],
    rewards: [],
    amount: expiredLocked,
    claimable: expiredLocked,
    category: 'lock',
  }

  if (rewards && totalLocked !== 0n) {
    rewards.map((reward, idx: number) => {
      claimableBalance.rewards?.push({
        ...reward,
        amount: (claimableBalance.amount * earnedRes[idx].amount) / totalLocked,
      })
    })
  }

  for (let lockIdx = 0; lockIdx < lockData.length; lockIdx++) {
    const lockedBalance = lockData[lockIdx]
    const { amount, unlockTime } = lockedBalance

    const balance: Balance = {
      ...locker,
      amount,
      claimable: 0n,
      underlyings: [underlying],
      unlockAt: unlockTime,
      rewards: [],
      category: 'lock',
    }

    if (rewards && totalLocked !== 0n) {
      rewards.map((reward, idx: number) => {
        balance.rewards?.push({
          ...reward,
          amount: (balance.amount * earnedRes[idx].amount) / totalLocked,
        })
      })
    }

    balances.push(balance)
  }

  return [claimableBalance, ...balances]
}

export async function getNFTLockerBalances(
  ctx: BalancesContext,
  locker: Contract,
  underlying: Token | Contract,
  methodName: string,
): Promise<LockBalance[]> {
  const balances: LockBalance[] = []
  const genericLocker = getNFTLockerAbi(methodName)

  const balanceOfsRes = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const tokenOfOwnerByIndexesRes = await multicall({
    ctx,
    calls: range(0, Number(balanceOfsRes)).map(
      (idx) => ({ target: locker.address, params: [ctx.address, BigInt(idx)] } as const),
    ),
    abi: abi.tokenOfOwnerByIndex,
  })

  const lockedsRes = await multicall({
    ctx,
    calls: mapSuccess(tokenOfOwnerByIndexesRes, (tokenIdx) => ({ target: locker.address, params: [tokenIdx.output] })),
    abi: genericLocker,
  })

  for (let idx = 0; idx < balanceOfsRes; idx++) {
    const lockedRes = lockedsRes[idx]

    if (!lockedRes.success) {
      continue
    }

    const now = Date.now() / 1000
    const [amount, end] = lockedRes.output as [bigint, bigint]
    const unlockAt = Number(end)

    balances.push({
      ...locker,
      amount,
      unlockAt,
      claimable: now > unlockAt ? amount : 0n,
      underlyings: [underlying],
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}
