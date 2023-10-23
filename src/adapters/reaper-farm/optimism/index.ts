import { getReaperFarmBalances } from '@adapters/reaper-farm/common/balance'
import { getReaperPools } from '@adapters/reaper-farm/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const beethovenVault: Contract = {
  chain: 'optimism',
  address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
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
