import type { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { mapSuccess, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  locked: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'locked',
    outputs: [
      { internalType: 'int128', name: 'amount', type: 'int128' },
      { internalType: 'uint256', name: 'end', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
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
} as const

const GYRO: Token = {
  chain: 'bsc',
  address: '0x1b239abe619e74232c827fbe5e49a4c072bd869d',
  decimals: 9,
  symbol: 'GYRO',
}

export async function getGyroLocker(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const balances: LockBalance[] = []
  const now = Date.now() / 1000

  const balancesOfsBI = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })
  const balancesOf = Number(balancesOfsBI)

  const tokenOfOwnerByIndexesRes = await multicall({
    ctx,
    calls: rangeBI(0n, balancesOfsBI).map((idx) => ({ target: locker.address, params: [ctx.address, idx] }) as const),
    abi: abi.tokenOfOwnerByIndex,
  })

  const lockedInfosResByIndexes = await multicall({
    ctx,
    calls: mapSuccess(
      tokenOfOwnerByIndexesRes,
      (tokenIdx) => ({ target: locker.address, params: [tokenIdx.output] }) as const,
    ),
    abi: abi.locked,
  })

  for (let balanceIdx = 0; balanceIdx < balancesOf; balanceIdx++) {
    const lockedInfosResByIndex = lockedInfosResByIndexes[balanceIdx]

    if (!lockedInfosResByIndex.success) {
      continue
    }

    const [amount, end] = lockedInfosResByIndex.output

    balances.push({
      ...locker,
      underlyings: [GYRO],
      decimals: 9,
      amount,
      claimable: now > end ? amount : 0n,
      rewards: undefined,
      unlockAt: Number(end),
      category: 'lock',
    })
  }

  return balances
}
