import { getMasterBalances } from '@adapters/magpie/common/balance'
import { getPenpiePools } from '@adapters/magpie/common/penpie'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const masterPenpie: Contract = {
  chain: 'optimism',
  address: '0x3cbfc97f87f534b42bb58276b7b5dcad29e57eac',
  rewards: ['0xc4a65a93dd6cd9717551ebe827e8baee025d1d7e'],
}

export const getContracts = async (ctx: BaseContext) => {
  const penpiePools = await getPenpiePools(ctx, masterPenpie)

  return {
    contracts: { penpiePools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    penpiePools: (...args) => getMasterBalances(...args, masterPenpie),
  })

  return {
    groups: [{ balances }],
  }
}
