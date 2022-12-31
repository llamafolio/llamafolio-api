import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances } from '../common/balances'
import { getPoolsContracts } from './pools'

const MiniFL: Contract = {
  name: 'MiniFl',
  chain: 'fantom',
  address: '0x838B7F64Fa89d322C563A6f904851A13a164f84C',
}

const ALPACA: Contract = {
  chain: 'fantom',
  address: '0xad996a45fd2373ed0b10efa4a8ecb9de445a4302',
  decimals: 18,
  symbols: 'ALPACA',
}

export const getContracts = async () => {
  const pools = await getPoolsContracts('fantom', MiniFL)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (ctx, pools) => getPoolsBalances(ctx, pools, MiniFL, ALPACA),
  })

  return {
    balances,
  }
}
