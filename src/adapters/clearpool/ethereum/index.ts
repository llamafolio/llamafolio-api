import type { AdapterConfig } from "@lib/adapter";import { getClearNodeStakeBalances, getClearPoolsBalances } from '@adapters/clearpool/common/balance'
import { getClearPools } from '@adapters/clearpool/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const factory: Contract = {
  chain: 'ethereum',
  address: '0xdE204e5a060bA5d3B63C7A4099712959114c2D48',
}

const nodeStaker: Contract = {
  chain: 'ethereum',
  address: '0x629e39da1db5654fe59cae31d48caebb8dc2a9c6',
  token: '0x66761fa41377003622aee3c7675fc7b5c1c2fac5',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getClearPools(ctx, factory)

  return {
    contracts: { pools, nodeStaker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getClearPoolsBalances,
    nodeStaker: getClearNodeStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1649635200,
                  }
                  