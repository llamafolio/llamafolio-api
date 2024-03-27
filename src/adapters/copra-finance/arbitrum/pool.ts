import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getCreditAccounts: {
    inputs: [],
    name: 'getCreditAccounts',
    outputs: [{ internalType: 'contract CreditAccount[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getTerms: {
    inputs: [],
    name: 'getTerms',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'tenor', type: 'uint256' },
          { internalType: 'uint256', name: 'principalAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'interestAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'securityDepositAmount', type: 'uint256' },
          { internalType: 'address', name: 'token', type: 'address' },
        ],
        internalType: 'struct ICreditAccount.Terms',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCopraPools(ctx: BaseContext, factory: Contract): Promise<Contract[]> {
  const poolAddresses = await call({ ctx, target: factory.address, abi: abi.getCreditAccounts })

  const underlyings = await multicall({
    ctx,
    calls: poolAddresses.map((pool) => ({ target: pool }) as const),
    abi: abi.getTerms,
  })

  return mapSuccessFilter(underlyings, (res) => {
    return {
      chain: ctx.chain,
      address: res.input.target,
      token: res.output.token,
    }
  })
}
