import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getSynapseContracts } from '../common/contract'
import { getSynapseBalances } from '../common/farm'

const SYN: Token = {
  chain: 'ethereum',
  address: '0x0f2D719407FdBeFF09D87557AbB7232601FD9F29',
  decimals: 18,
  symbol: 'SYN',
}

const miniChef: Contract = {
  chain: 'ethereum',
  address: '0xd10eF2A513cEE0Db54E959eF16cAc711470B62cF',
  pool: ['0x1116898dda4015ed8ddefb84b6e8bc24528af2d8'],
  rewards: [SYN],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSynapseContracts(ctx, miniChef)

  return {
    contracts: { miniChef, pools },
    revalidate: 60 * 60,
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
