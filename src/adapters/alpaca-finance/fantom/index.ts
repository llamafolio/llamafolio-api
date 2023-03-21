import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPoolsBalances } from '../common/balances'
import { getLockerBalance } from '../common/locker'
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

const xALPACA: Contract = {
  chain: 'fantom',
  address: '0x9e698f779cec7f42663b051ff8176a55fcb8d471',
  decimals: 18,
  symbol: 'xALPACA',
  underlyings: [ALPACA],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolsContracts(ctx, MiniFL)

  return {
    contracts: { pools, xALPACA },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (ctx, pools) => getPoolsBalances(ctx, pools, MiniFL, ALPACA),
    xALPACA: getLockerBalance,
  })

  return {
    groups: [{ balances }],
  }
}
