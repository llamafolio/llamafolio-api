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

export async function getYearnVaults(ctx: BaseContext, curvePools?: Contract[]): Promise<Contract[]> {
  const API_URL = `https://api.yexporter.io/v1/chains/${chainId[ctx.chain]}/vaults/all`
  const datas = await fetch(API_URL).then((response) => response.json())

  const vaults = datas
    .map((vault: any) => {
      const { address, symbol, display_name, token, migration } = vault

      return {
        chain: ctx.chain,
        name: display_name,
        address,
        symbol,
        lpToken: token.address,
        underlyings: [token.address],
        migration,
      }
    })
    .filter((vault: Contract) => {
      // Only keeps vaults that have migrated, thus avoiding counting old vaults and new ones in duplicate
      return vault.migration && vault.address === vault.migration.address
    })

  return vaults.map((vault: Contract) => {
    // Merges with Curve pools to bring out the underlyings, otherwise returns classic vault underlyings (mostly unwrap LP but not only)
    const matchingPool = curvePools && curvePools.find((pool) => pool.lpToken === vault.lpToken)

    if (matchingPool) {
      return {
        ...matchingPool,
        ...vault,
        underlyings: matchingPool.underlyings,
      }
    }

    return vault
  })
}

export async function getYearnOptimisticVault(
  ctx: BaseContext,
  registry: Contract,
  curvePools?: Contract[],
): Promise<Contract[]> {
  const assetsStaticsRes = await call({ ctx, target: registry.address, abi: abi.assetsStatic })

  const vaults: Contract[] = assetsStaticsRes
    .map((asset) => {
      const { id, tokenId } = asset

      return {
        chain: ctx.chain,
        address: id,
        lpToken: tokenId,
        underlyings: [tokenId],
      }
    })
    .filter((vault: Contract) => {
      return vault.address !== '0x5e70E0EdE43373bD9CF4Bc85199d424AcF0241EF'
    })

  const fmtCurveVaults = vaults.map((vault: Contract) => {
    // Merges with Curve pools to bring out the underlyings, otherwise returns classic vault underlyings (mostly unwrap LP but not only)
    const matchingPool = curvePools && curvePools.find((pool) => pool.lpToken === vault.lpToken)

    if (matchingPool) {
      return {
        ...matchingPool,
        ...vault,
        underlyings: matchingPool.underlyings,
      }
    }

    return vault
  })

  const fmtVeloVaults = await getPairsDetails(
    ctx,
    fmtCurveVaults.map((vault) => ({ ...vault, address: vault.lpToken, staker: vault.address })),
  )

  fmtVeloVaults.forEach((vault) => {
    vault.address = vault.staker
  })

  mergeContracts(fmtCurveVaults, fmtVeloVaults)

  return fmtCurveVaults
}

export function mergeContracts(contract: Contract[], fmtContract: Contract[]) {
  for (let i = 0; i < fmtContract.length; i++) {
    const contractIndex = contract.findIndex((c) => c.address === fmtContract[i].address)
    if (contractIndex !== -1) {
      contract[contractIndex] = Object.assign({}, contract[contractIndex], fmtContract[i])
    }
  }
}
