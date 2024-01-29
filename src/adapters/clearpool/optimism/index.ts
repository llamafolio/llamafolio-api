import type { AdapterConfig } from "@lib/adapter";import { getClearPoolsBalances } from '@adapters/clearpool/common/balance'
import { getClearPools } from '@adapters/clearpool/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const factory: Contract = {
  chain: 'optimism',
  address: '0x99C10A7aBd93b2db6d1a2271e69F268a2c356b80',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getClearPools(ctx, factory)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getClearPoolsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1698451200,
                  }
                  