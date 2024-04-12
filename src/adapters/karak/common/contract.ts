import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  depositToken: {
    inputs: [],
    name: 'depositToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getVaults: {
    inputs: [],
    name: 'getVaults',
    outputs: [{ internalType: 'contract IVault[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getKarakTokens(ctx: BaseContext, supervisor: Contract): Promise<Contract> {
  const vaults = await call({ ctx, target: supervisor.address, abi: abi.getVaults })
  const tokens = await multicall({ ctx, calls: vaults.map((vault) => ({ target: vault })), abi: abi.depositToken })

  const underlyings = mapSuccessFilter(tokens, (res) => res.output)
  return { ...supervisor, underlyings }
}
