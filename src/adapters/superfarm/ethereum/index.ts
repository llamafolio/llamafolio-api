import type { AdapterConfig } from "@lib/adapter";import { getSuperFarmBalances } from '@adapters/superfarm/ethereum/balance'
import { getSuperfarmContracts } from '@adapters/superfarm/ethereum/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const gemFarm: Contract = {
  chain: 'ethereum',
  address: '0xf35a92585ceee7251388e14f268d9065f5206207',
}

const injectiveFarm: Contract = {
  chain: 'ethereum',
  address: '0x8e586d927ace36a3ef7bddf9f899d2e385d5fc9b',
}

const revvGearFarm: Contract = {
  chain: 'ethereum',
  address: '0xb3ea98747440addc6a262735e71b5a5cb29edd80',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSuperfarmContracts(ctx, [gemFarm, injectiveFarm, revvGearFarm])

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getSuperFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1640476800,
                  }
                  