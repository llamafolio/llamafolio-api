import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
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
} as const

export async function getHorizaLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const userNFTLength = await call({ ctx, target: locker.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const tokenIds = await multicall({
    ctx,
    calls: rangeBI(0n, userNFTLength).map((i) => ({ target: locker.address, params: [ctx.address, i] }) as const),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokenInfos = await multicall({
    ctx,
    calls: mapSuccessFilter(tokenIds, (res) => ({ target: locker.address, params: [res.output] }) as const),
    abi: abi.locked,
  })

  return mapSuccessFilter(tokenInfos, (res) => {
    const now = Date.now() / 1000
    const [amount, end] = res.output
    const unlockAt = Number(end)

    return {
      ...locker,
      amount,
      claimable: now > unlockAt ? amount : 0n,
      unlockAt,
      underlyings: undefined,
      rewards: undefined,
      category: 'lock',
    }
  })
}
