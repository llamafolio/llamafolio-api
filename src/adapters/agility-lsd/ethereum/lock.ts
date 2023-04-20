import { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { range } from '@lib/array'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getUserRedeem: {
    inputs: [
      { internalType: 'address', name: 'userAddress', type: 'address' },
      { internalType: 'uint256', name: 'redeemIndex', type: 'uint256' },
    ],
    name: 'getUserRedeem',
    outputs: [
      { internalType: 'uint256', name: 'agiAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'ESAGIAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'endTime', type: 'uint256' },
      { internalType: 'address', name: 'dividendsContract', type: 'address' },
      { internalType: 'uint256', name: 'dividendsAllocation', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getUserRedeemsLength: {
    inputs: [{ internalType: 'address', name: 'userAddress', type: 'address' }],
    name: 'getUserRedeemsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const AGI: Token = {
  chain: 'ethereum',
  address: '0x5F18ea482ad5cc6BC65803817C99f477043DcE85',
  decimals: 18,
  symbol: 'AGI',
}

export async function getAgilityLockerBalances(ctx: BalancesContext, lockers: Contract[]): Promise<LockBalance[]> {
  const balances: LockBalance[] = []

  const userRedeemsLengthsRes = await multicall({
    ctx,
    calls: lockers.map((locker) => ({ target: locker.address, params: [ctx.address] })),
    abi: abi.getUserRedeemsLength,
  })

  const getUserRedeemsRes = await multicall({
    ctx,
    calls: userRedeemsLengthsRes.flatMap((length) =>
      isSuccess(length)
        ? range(0, length.output).map((_, idx) => ({ target: length.input.target, params: [ctx.address, idx] }))
        : null,
    ),
    abi: abi.getUserRedeem,
  })

  for (const locker of lockers) {
    for (let resIdx = 0; resIdx < getUserRedeemsRes.length; resIdx++) {
      const getUserRedeemRes = getUserRedeemsRes[resIdx]

      if (!isSuccess(getUserRedeemRes)) {
        continue
      }

      const { agiAmount, ESAGIAmount, endTime } = getUserRedeemRes.output
      const now = Date.now() / 1000
      const unlockAt = endTime

      balances.push({
        ...locker,
        amount: BigNumber.from(ESAGIAmount),
        claimable: now > unlockAt ? BigNumber.from(agiAmount) : BN_ZERO,
        underlyings: [{ ...AGI, amount: BigNumber.from(agiAmount) }],
        rewards: undefined,
        unlockAt,
        category: 'lock',
      })
    }
  }

  return balances
}
