import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  allWhitelistedTokensLength: {
    constant: true,
    inputs: [],
    name: 'allWhitelistedTokensLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  allWhitelistedTokens: {
    constant: true,
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allWhitelistedTokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getVaultTokens(ctx: BaseContext, vault: Contract) {
  const allWhitelistedTokensLength = await call({
    ctx,
    abi: abi.allWhitelistedTokensLength,
    target: vault.address,
  })

  const allWhitelistedTokensRes = await multicall({
    ctx,
    calls: rangeBI(0n, allWhitelistedTokensLength).map((idx) => ({ target: vault.address, params: [idx] } as const)),
    abi: abi.allWhitelistedTokens,
  })

  return mapSuccessFilter(allWhitelistedTokensRes, (res) => res.output)
}
