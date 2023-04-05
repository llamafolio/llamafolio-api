import { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

import { BN_ZERO } from './math'
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
}

function getLockerAbi(methodName?: string): any {
  return JSON.parse(JSON.stringify(abi.locks).replace(abi.locks.name, methodName ? `${methodName}` : abi.locks.name))
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
    const underlying = locker.underlyings?.[0] as Contract
    const lockBalanceRes = lockBalancesRes[lockerIdx]

    if (!underlying || !isSuccess(lockBalanceRes)) {
      continue
    }

    const unlockAt = lockBalanceRes.output.end

    balances.push({
      ...locker,
      amount: BigNumber.from(lockBalanceRes.output.amount),
      underlyings: [underlying],
      claimable: now > unlockAt ? BigNumber.from(lockBalanceRes.output.amount) : BN_ZERO,
      unlockAt,
      rewards: undefined,
      category: 'lock',
    })
  }

  return balances
}
