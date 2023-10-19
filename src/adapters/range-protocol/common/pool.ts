import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  vaultCount: {
    inputs: [],
    name: 'vaultCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getVaultAddresses: {
    inputs: [
      { internalType: 'uint256', name: 'startIdx', type: 'uint256' },
      { internalType: 'uint256', name: 'endIdx', type: 'uint256' },
    ],
    name: 'getVaultAddresses',
    outputs: [{ internalType: 'address[]', name: 'vaultList', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getRangePools(ctx: BaseContext, factory: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

  const vaultsCount = await call({ ctx, target: factory.address, abi: abi.vaultCount })
  const vaultsAddresses = await call({
    ctx,
    target: factory.address,
    params: [0n, vaultsCount - 1n],
    abi: abi.getVaultAddresses,
  })

  for (const vaultsAddress of vaultsAddresses) {
    pools.push({ chain: ctx.chain, address: vaultsAddress })
  }

  return getPairsDetails(ctx, pools)
}
