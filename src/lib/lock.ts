import { Balance, BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

import { range } from './array'
import { abi as erc20Abi } from './erc20'
import { BN_ZERO, isZero, sumBN } from './math'
import { multicall } from './multicall'
import { isSuccess } from './type'

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
}

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

  const {
    output: { amount, end },
  } = await call({ ctx, target: locker.address, params: [ctx.address], abi: genericLocker })

  const now = Date.now() / 1000
  const unlockAt = end

  return {
    ...locker,
    amount: BigNumber.from(amount),
    underlyings: [underlying],
    claimable: now > unlockAt ? BigNumber.from(amount) : BN_ZERO,
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

    if (!underlyings || !isSuccess(lockBalanceRes)) {
      continue
    }

    const unlockAt = lockBalanceRes.output.end

    balances.push({
      ...locker,
      amount: BigNumber.from(lockBalanceRes.output.amount),
      underlyings: underlyings,
      claimable: now > unlockAt ? BigNumber.from(lockBalanceRes.output.amount) : BN_ZERO,
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

  const [{ output: lockedBalances }, { output: earnedRes }] = await Promise.all([
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.lockedBalances }),
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.claimableRewards }),
  ])

  const locked = sumBN((lockedBalances.lockData || []).map((lockData: any) => lockData.amount))
  const totalLocked = BigNumber.from(lockedBalances.total)
  const expiredLocked = totalLocked.sub(locked)

  const claimableBalance: Balance = {
    ...locker,
    underlyings: [underlying],
    rewards: [],
    amount: expiredLocked,
    claimable: expiredLocked,
    category: 'lock',
  }

  if (rewards && !isZero(totalLocked)) {
    rewards.map((reward, idx: number) => {
      claimableBalance.rewards?.push({
        ...reward,
        amount: BigNumber.from(claimableBalance.amount).mul(earnedRes[idx].amount).div(totalLocked),
      })
    })
  }

  for (let lockIdx = 0; lockIdx < lockedBalances.lockData.length; lockIdx++) {
    const lockedBalance = lockedBalances.lockData[lockIdx]
    const { amount, unlockTime } = lockedBalance

    const balance: Balance = {
      ...locker,
      amount: BigNumber.from(amount),
      claimable: BN_ZERO,
      underlyings: [underlying],
      unlockAt: unlockTime,
      rewards: [],
      category: 'lock',
    }

    if (rewards && !isZero(totalLocked)) {
      rewards.map((reward, idx: number) => {
        balance.rewards?.push({
          ...reward,
          amount: BigNumber.from(balance.amount).mul(earnedRes[idx].amount).div(totalLocked),
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

  const { output: balanceOfsRes } = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const tokenOfOwnerByIndexesRes = await multicall({
    ctx,
    calls: range(0, balanceOfsRes).map((idx) => ({ target: locker.address, params: [ctx.address, idx] })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const lockedsRes = await multicall({
    ctx,
    calls: tokenOfOwnerByIndexesRes.map((tokenIdx) =>
      isSuccess(tokenIdx) ? { target: locker.address, params: [tokenIdx.output] } : null,
    ),
    abi: genericLocker,
  })

  for (let idx = 0; idx < balanceOfsRes; idx++) {
    const lockedRes = lockedsRes[idx]

    if (!isSuccess(lockedRes)) {
      continue
    }

    const now = Date.now() / 1000
    const unlockAt = lockedRes.output.end

    balances.push({
      ...locker,
      amount: BigNumber.from(lockedRes.output.amount),
      unlockAt,
      claimable: now > unlockAt ? BigNumber.from(lockedRes.output.amount) : BN_ZERO,
      underlyings: [underlying],
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}
