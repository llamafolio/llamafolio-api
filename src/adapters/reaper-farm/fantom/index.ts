import type { AdapterConfig } from "@lib/adapter";import { getReaperFarmBalances } from '@adapters/reaper-farm/common/balance'
import { getReaperPools } from '@adapters/reaper-farm/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const beethovenVault: Contract = {
  chain: 'fantom',
  address: '0x20dd72ed959b6147912c2e529f0a0c651c33c9ce',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getReaperPools(ctx)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getReaperFarmBalances(...args, beethovenVault),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1625702400,
                  }
                  