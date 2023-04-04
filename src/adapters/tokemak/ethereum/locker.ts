import { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  currentCycle: {
    inputs: [],
    name: 'currentCycle',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  currentCycleIndex: {
    inputs: [],
    name: 'currentCycleIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  cycleDuration: {
    inputs: [],
    name: 'cycleDuration',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getDepositInfo: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getDepositInfo',
    outputs: [
      { internalType: 'uint256', name: 'lockCycle', type: 'uint256' },
      { internalType: 'uint256', name: 'lockDuration', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const TOKE: Token = {
  chain: 'ethereum',
  address: '0x2e9d63788249371f1DFC918a52f8d799F4a38C94',
  decimals: 18,
  symbol: 'TOKE',
}

export async function getTokemakLockerBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance> {
  const [
    { output: currentCycleIndexRes },
    { output: currentCycleRes },
    { output: cycleDurationRes },
    {
      output: { lockCycle, lockDuration, amount },
    },
  ] = await Promise.all([
    call({ ctx, target: locker.manager, abi: abi.currentCycleIndex }),
    call({ ctx, target: locker.manager, abi: abi.currentCycle }),
    call({ ctx, target: locker.manager, abi: abi.cycleDuration }),
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.getDepositInfo }),
  ])

  const lockerDate = calculateLockerDate(
    currentCycleIndexRes,
    currentCycleRes,
    lockCycle,
    lockDuration,
    cycleDurationRes,
  )

  const now = Math.floor(Date.now() / 1000)

  return {
    ...locker,
    amount: BigNumber.from(amount),
    underlyings: [TOKE],
    claimable: lockerDate < now ? BigNumber.from(amount) : BN_ZERO,
    rewards: undefined,
    unlockAt: lockerDate,
    category: 'lock',
  }
}

function calculateLockerDate(
  currentCycleIndexRes: string,
  currentCycleRes: string,
  lockCycle: string,
  lockDuration: string,
  cycleDurationRes: string,
) {
  const now = parseInt(currentCycleRes)

  const userLockCycle =
    (parseInt(currentCycleIndexRes) - (parseInt(lockCycle) + parseInt(lockDuration))) * parseInt(cycleDurationRes)

  return now - userLockCycle
}
