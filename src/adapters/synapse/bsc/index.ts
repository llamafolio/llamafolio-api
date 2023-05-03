import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getSynapseContracts } from '../common/contract'
import { getSynapseBalances } from '../common/farm'

const SYN: Token = {
  chain: 'bsc',
  address: '0xa4080f1778e69467e905b8d6f72f6e441f9e9484',
  decimals: 18,
  symbol: 'SYN',
}

const miniChef: Contract = {
  chain: 'bsc',
  address: '0x8F5BBB2BB8c2Ee94639E55d5F41de9b4839C1280',
  pool: ['0x930d001b7efb225613aC7F35911c52Ac9E111Fa9', '0x28ec0B36F0819ecB5005cAB836F4ED5a2eCa4D13'],
  rewards: [SYN],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSynapseContracts(ctx, miniChef)

  return {
    contracts: { miniChef, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getSynapseBalances(...args, miniChef),
  })

  return {
    groups: [{ balances }],
  }
}
