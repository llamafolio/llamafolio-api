import type { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  lockedToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lockedToken',
    outputs: [
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
      { internalType: 'address', name: 'withdrawer', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'unlockTimestamp', type: 'uint256' },
      { internalType: 'bool', name: 'withdrawn', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getDepositsByWithdrawer: {
    inputs: [{ internalType: 'address', name: '_withdrawer', type: 'address' }],
    name: 'getDepositsByWithdrawer',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLockersBalances(
  ctx: BalancesContext,
  lockManager: Contract,
  lockers: Contract[],
): Promise<LockBalance[] | undefined> {
  const [userTokenIds] = await call({
    ctx,
    target: lockManager.address,
    params: [ctx.address],
    abi: abi.getDepositsByWithdrawer,
  })

  if (!userTokenIds) return

  const userBalancesRes = await call({
    ctx,
    target: lockManager.address,
    params: [userTokenIds],
    abi: abi.lockedToken,
  })

  const [token, _user, amount, end] = userBalancesRes
  const lockerToken = lockers.find((locker) => locker.address.toLowerCase() === token.toLowerCase())

  if (!lockerToken) return

  const now = Date.now() / 1000
  const unlockAt = Number(end)

  const lockerBalance: LockBalance = {
    ...lockerToken,
    amount,
    underlyings: lockerToken?.underlyings as Contract[],
    claimable: now > unlockAt ? amount : 0n,
    unlockAt,
    rewards: undefined,
    category: 'lock',
  }

  return getUnderlyingBalances(ctx, [lockerBalance])
}
