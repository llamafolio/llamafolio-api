import type { AdapterConfig } from "@lib/adapter";import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getApeStakeBalances } from './balance'

const apeStake: Contract = {
  chain: 'ethereum',
  address: '0x5954ab967bc958940b7eb73ee84797dc8a2afbb9',
  underlyings: ['0x4d224452801ACEd8B2F0aebE155379bb5D594381'],
  rewards: ['0x4d224452801ACEd8B2F0aebE155379bb5D594381'],
}

export const getContracts = async () => {
  return {
    contracts: { apeStake },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    apeStake: getApeStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1671840000,
                  }
                  