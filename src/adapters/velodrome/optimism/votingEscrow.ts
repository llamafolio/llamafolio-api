import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

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

export async function getVotingEscrowBalances(ctx: BalancesContext, votingEscrow: Contract, velo: Contract) {
  const balanceOfRes = await call({ ctx, target: votingEscrow.address, abi: erc20Abi.balanceOf, params: [ctx.address] })

  const balancesLength = Number(balanceOfRes)

  // token IDS
  const tokensOfOwnerByIndexRes = await multicall({
    ctx,
    calls: range(0, balancesLength).map(
      (idx) => ({ target: votingEscrow.address, params: [ctx.address, BigInt(idx)] } as const),
    ),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokenIds = mapSuccessFilter(tokensOfOwnerByIndexRes, (res) => res.output)

  return getTokenIdsBalances(ctx, votingEscrow, velo, tokenIds)
}

export async function getTokenIdsBalances(
  ctx: BalancesContext,
  votingEscrow: Contract,
  velo: Contract,
  tokenIds: bigint[],
) {
  const lockedRes = await multicall({
    ctx,
    calls: tokenIds.map((tokenId) => ({ target: votingEscrow.address, params: [tokenId] } as const)),
    abi: abi.locked,
  })

  const balances: Balance[] = mapSuccessFilter(lockedRes, (res) => {
    const [amount, end] = res.output
    return {
      ...velo,
      category: 'lock' as Category,
      amount: amount,
      unlockAt: end,
    }
  })

  // TODO: get bribes

  return balances
}
