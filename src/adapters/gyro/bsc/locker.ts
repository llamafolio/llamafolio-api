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
}

const GYRO: Token = {
  chain: 'bsc',
  address: '0x1b239abe619e74232c827fbe5e49a4c072bd869d',
  decimals: 9,
  symbol: 'GYRO',
}

export async function getGyroLocker(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const balances: LockBalance[] = []
  const now = Date.now() / 1000

  const { output: balancesOfsRes } = await call({
    ctx,
    target: locker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const tokenOfOwnerByIndexesRes = await multicall({
    ctx,
    calls: range(0, balancesOfsRes).map((_, idx) => ({ target: locker.address, params: [ctx.address, idx] })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const lockedInfosResByIndexes = await multicall({
    ctx,
    calls: tokenOfOwnerByIndexesRes.map((tokenIdx) =>
      isSuccess(tokenIdx) ? { target: locker.address, params: [tokenIdx.output] } : null,
    ),
    abi: abi.locked,
  })

  for (let balanceIdx = 0; balanceIdx < balancesOfsRes; balanceIdx++) {
    const lockedInfosResByIndex = lockedInfosResByIndexes[balanceIdx]

    if (!isSuccess(lockedInfosResByIndex)) {
      continue
    }

    balances.push({
      ...locker,
      underlyings: [GYRO],
      decimals: 9,
      amount: BigNumber.from(lockedInfosResByIndex.output.amount),
      claimable: now > lockedInfosResByIndex.output.end ? BigNumber.from(lockedInfosResByIndex.output.amount) : BN_ZERO,
      rewards: undefined,
      unlockAt: lockedInfosResByIndex.output.end,
      category: 'lock',
    })
  }

  return balances
}
