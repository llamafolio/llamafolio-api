import type { BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

import { abi as erc20Abi } from '@/lib/erc20'

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

const SCALE: Contract = {
  chain: 'base',
  address: '0x54016a4848a38f257b6e96331f7404073fd9c32c',
  decimals: 18,
  symbol: 'SCALE',
}

export async function getScaleLockBalances(ctx: BalancesContext, locker: Contract): Promise<LockBalance[]> {
  const userNftLength = await call({ ctx, target: locker.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const userNftIds = await multicall({
    ctx,
    calls: rangeBI(0n, userNftLength).map((i) => ({ target: locker.address, params: [ctx.address, i] }) as const),
    abi: abi.tokenOfOwnerByIndex,
  })

  const nftValues = await multicall({
    ctx,
    calls: mapSuccessFilter(userNftIds, (res) => ({ target: locker.address, params: [res.output] }) as const),
    abi: abi.locked,
  })

  return mapSuccessFilter(nftValues, (res) => {
    const now = Date.now() / 1000
    const [amount, end] = res.output
    const unlockAt = Number(end)

    return {
      ...locker,
      amount,
      underlyings: [SCALE],
      claimable: now > unlockAt ? amount : 0n,
      unlockAt,
      rewards: undefined,
      category: 'lock',
    }
  })
}
