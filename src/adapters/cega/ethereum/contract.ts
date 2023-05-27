import type { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'

const abi = {
  asset: {
    inputs: [],
    name: 'asset',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getVaultAddresses: {
    inputs: [],
    name: 'getVaultAddresses',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCegaContracts(ctx: BaseContext, vaults: `0x${string}`[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const [assetsRes, addressesRes] = await Promise.all([
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault })),
      abi: abi.asset,
    }),
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault })),
      abi: abi.getVaultAddresses,
    }),
  ])

  vaults.forEach((vault, vaultIdx) => {
    const assetRes = assetsRes[vaultIdx]
    const addressRes = addressesRes[vaultIdx]

    if (!assetRes.success || !addressRes.success) {
      return
    }

    addressRes.output.forEach((address) => {
      contracts.push({
        chain: ctx.chain,
        address,
        underlyings: [assetRes.output],
        provider: vault,
      })
    })
  })

  return contracts
}
