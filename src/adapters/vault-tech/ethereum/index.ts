import type { AdapterConfig } from "@lib/adapter";import { getVaultTechBalances, getVaultTechContracts } from '@adapters/vault-tech/ethereum/vault'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultAddresses: `0x${string}`[] = [
  '0xcd2d59d9597e782858483f3bc78fb7a9f47df3ae',
  '0xf671d40a8011e7868c0a7e4ad2908bdc41c519cb',
  '0x72f9244fe481761fa0e403e2614d487525f67375',
]

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getVaultTechContracts(ctx, vaultAddresses)

  return {
    contracts: { vaults },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getVaultTechBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1702425600,
                  }
                  