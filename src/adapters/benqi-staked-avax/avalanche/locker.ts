import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  getUnlockRequestCount: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUnlockRequestCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPaginatedUnlockRequests: {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'from', type: 'uint256' },
      { internalType: 'uint256', name: 'to', type: 'uint256' },
    ],
    name: 'getPaginatedUnlockRequests',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
          { internalType: 'uint256', name: 'shareAmount', type: 'uint256' },
        ],
        internalType: 'struct StakedAvaxStorage.UnlockRequest[]',
        name: '',
        type: 'tuple[]',
      },
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  cooldownPeriod: {
    inputs: [],
    name: 'cooldownPeriod',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPooledAvaxByShares: {
    inputs: [{ internalType: 'uint256', name: 'shareAmount', type: 'uint256' }],
    name: 'getPooledAvaxByShares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WAVAX: Token = {
  chain: 'avalanche',
  address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  symbol: 'WAVAX ',
  decimals: 18,
}

export async function getBenqiLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance | undefined> {
  const [lockersPositionsLength, cooldownPeriodRes] = await Promise.all([
    call({
      ctx,
      target: locker.address,
      params: [ctx.address],
      abi: abi.getUnlockRequestCount,
    }),
    call({ ctx, target: locker.address, abi: abi.cooldownPeriod }),
  ])

  if (lockersPositionsLength === 0n) {
    return
  }

  const lockersBalancesRes = await call({
    ctx,
    target: locker.address,
    params: [ctx.address, 0n, lockersPositionsLength],
    abi: abi.getPaginatedUnlockRequests,
  })

  //@ts-ignore
  const lockerBalance = lockersBalancesRes.output.flat()[0]

  const fmtLockerBalancesRes = await call({
    ctx,
    target: locker.address,
    params: [lockerBalance.shareAmount],
    abi: abi.getPooledAvaxByShares,
  })

  const now = Date.now() / 1000
  const unlockAt = parseInt(lockerBalance.startedAt) + Number(cooldownPeriodRes)

  return {
    ...locker,
    rewards: undefined,
    amount: BigNumber.from(fmtLockerBalancesRes),
    claimable: now > unlockAt ? BigNumber.from(fmtLockerBalancesRes) : BN_ZERO,
    unlockAt,
    underlyings: [{ ...WAVAX }],
    category: 'lock',
  }
}
