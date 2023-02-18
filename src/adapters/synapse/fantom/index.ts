import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getSynapseContracts } from '../common/contract'
import { getSynapseBalances } from '../common/farm'

const SYN: Token = {
  chain: 'fantom',
  address: '0xe55e19fb4f2d85af758950957714292dac1e25b2',
  decimals: 18,
  symbol: 'SYN',
}

const miniChef: Contract = {
  chain: 'fantom',
  address: '0xaed5b25be1c3163c907a471082640450f928ddfe',
  pool: ['', '0x2913E812Cf0dcCA30FB28E6Cac3d2DCFF4497688', '', '0x85662fd123280827e11C59973Ac9fcBE838dC3B4'],
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
    balances,
  }
}
