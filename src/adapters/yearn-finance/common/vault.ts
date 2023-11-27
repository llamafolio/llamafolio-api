import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  assetsStatic: {
    inputs: [],
    name: 'assetsStatic',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'id', type: 'address' },
          { internalType: 'string', name: 'typeId', type: 'string' },
          { internalType: 'address', name: 'tokenId', type: 'address' },
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'string', name: 'version', type: 'string' },
          { internalType: 'string', name: 'symbol', type: 'string' },
          { internalType: 'uint8', name: 'decimals', type: 'uint8' },
        ],
        internalType: 'struct RegistryAdapterV2Vault.AssetStatic[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const chainId: { [key: string]: number } = {
  ethereum: 1,
  arbitrum: 42161,
  fantom: 250,
  base: 8453,
  optimism: 10,
}

export async function getYearnVaults(ctx: BaseContext): Promise<Contract[]> {
  const API_URL = `https://api.yexporter.io/v1/chains/${chainId[ctx.chain]}/vaults/all`
  const datas = await fetch(API_URL).then((response) => response.json())

  const pools = datas
    .map((vault: any) => {
      const { address, symbol, display_name, token, migration } = vault

      return {
        chain: ctx.chain,
        name: display_name,
        address,
        symbol,
        token: token.address,
        underlyings: [token.address],
        migration,
      }
    })
    .filter((vault: Contract) => {
      return vault.migration && vault.address === vault.migration.address
    })

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token! })
}

export async function getYearnOptimisticVault(ctx: BaseContext, registry: Contract): Promise<Contract[]> {
  const assetsStaticsRes = await call({ ctx, target: registry.address, abi: abi.assetsStatic })

  const vaults: Contract[] = assetsStaticsRes.map((asset) => {
    const { id, tokenId } = asset

    return {
      chain: ctx.chain,
      address: id,
      token: tokenId,
      underlyings: [tokenId],
    }
  })

  return getPairsDetails(ctx, vaults, { getAddress: (contract) => contract.token! })
}
