import type { AdapterConfig } from "@lib/adapter";import { getDyadNFTBalances } from '@adapters/dyad/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'

const dNFT: Contract = {
  chain: 'ethereum',
  address: '0xdc400bbe0b8b79c07a962ea99a642f5819e3b712',
  token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
}

export const getContracts = () => {
  return {
    contracts: { dNFT },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx) => {
  const vaultsBalancesGroups = await getDyadNFTBalances(ctx, dNFT)

  return {
    groups: [...vaultsBalancesGroups],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1690070400,
                  }
                  