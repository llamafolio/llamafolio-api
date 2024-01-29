import type { AdapterConfig } from "@lib/adapter";import { getAmphorBalances } from '@adapters/amphor/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const ampr_LP_ETH: Contract = {
  chain: 'ethereum',
  address: '0x2791eb5807d69fe10c02eed6b4dc12bac0701744',
  underlyings: ['0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0'],
}

const ampr_LP_USDC: Contract = {
  chain: 'ethereum',
  address: '0x3b022edecd65b63288704a6fa33a8b9185b5096b',
  underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
}

export const getContracts = () => {
  return {
    contracts: { assets: [ampr_LP_ETH, ampr_LP_USDC] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    assets: getAmphorBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1696723200,
                  }
                  