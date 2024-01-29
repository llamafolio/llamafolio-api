import type { AdapterConfig } from "@lib/adapter";import { getWhiteBalance } from '@adapters/whiteheart/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sWHITE: Contract = {
  chain: 'ethereum',
  address: '0xc0425f0c7f84956d21ad767abd1892344783be29',
  underlyings: ['0x5F0E628B693018f639D10e4A4F59BD4d8B2B6B44'],
}

export const getContracts = () => {
  return {
    contracts: { sWHITE },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sWHITE: getWhiteBalance,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1616713200,
                  }
                  