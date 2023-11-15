import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  virtualUnits: {
    inputs: [],
    name: 'virtualUnits',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'units', type: 'uint256' },
        ],
        internalType: 'struct TokenInfo[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getAMKTStaker(ctx: BaseContext, vault: Contract, staker: Contract): Promise<Contract> {
  const virtualUnits = await call({ ctx, target: vault.address, abi: abi.virtualUnits })
  const underlyings = virtualUnits.map((unit) => unit.token)

  return { ...staker, underlyings }
}
