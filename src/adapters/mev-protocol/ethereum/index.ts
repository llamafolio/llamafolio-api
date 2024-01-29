import type { AdapterConfig } from "@lib/adapter";import { getMevBalance } from '@adapters/mev-protocol/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'ethereum',
  address: '0x24ae2da0f361aa4be46b48eb19c91e02c5e4f27e',
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getMevBalance,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1698451200,
                  }
                  