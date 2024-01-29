import type { AdapterConfig } from "@lib/adapter";import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getStakeBalances } from './stake'

const HEX: Contract = {
  name: 'HEX',
  chain: 'ethereum',
  address: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39',
  decimals: 8,
  symbol: 'HEX',
}

export const getContracts = () => {
  return {
    contracts: { HEX },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    HEX: getStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1576454400,
                  }
                  