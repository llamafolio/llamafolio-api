import { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

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
}

export async function getVaultTokens(ctx: BaseContext, vault: Contract) {
  const { output: allWhitelistedTokensLengthRes } = await call({
    ctx,
    abi: abi.allWhitelistedTokensLength,
    target: vault.address,
  })

  const allWhitelistedTokensLength = parseInt(allWhitelistedTokensLengthRes)

  const allWhitelistedTokensRes = await multicall<string, [number], string>({
    ctx,
    calls: range(0, allWhitelistedTokensLength).map((idx) => ({
      target: vault.address,
      params: [idx],
    })),
    abi: abi.allWhitelistedTokens,
  })

  return allWhitelistedTokensRes.filter(isSuccess).map((res) => res.output)
}
