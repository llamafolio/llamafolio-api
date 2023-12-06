import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  nextMintTokenId: {
    inputs: [],
    name: 'nextMintTokenId',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  balanceOfBatch: {
    inputs: [
      { internalType: 'address[]', name: 'accounts', type: 'address[]' },
      { internalType: 'uint256[]', name: 'ids', type: 'uint256[]' },
    ],
    name: 'balanceOfBatch',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  valueOf: {
    inputs: [{ internalType: 'uint256', name: '_tokenId', type: 'uint256' }],
    name: 'valueOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getNodeEtherFiBalances(
  ctx: BalancesContext,
  _manager: Contract,
  nodeStaker: Contract,
): Promise<Balance[]> {
  const tokenIdsLength = await call({ ctx, target: nodeStaker.address, abi: abi.nextMintTokenId })

  const userTokensIdsRes = await call({
    ctx,
    target: nodeStaker.address,
    params: [Array(tokenIdsLength).fill(ctx.address), rangeBI(0n, BigInt(tokenIdsLength))],
    abi: abi.balanceOfBatch,
  })

  const userTokenIds = userTokensIdsRes.flatMap((tokenId, i) => (tokenId !== 0n ? [BigInt(i)] : []))

  const tokenIdValues = await multicall({
    ctx,
    calls: userTokenIds.map((id) => ({ target: nodeStaker.address, params: [id] }) as const),
    abi: abi.valueOf,
  })

  return mapSuccessFilter(tokenIdValues, (res) => ({
    ...nodeStaker,
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))
}
