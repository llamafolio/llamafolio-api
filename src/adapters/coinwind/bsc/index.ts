import { getCoinwindBalances } from '@adapters/coinwind/common/balance'
import { getCoinWindContracts } from '@adapters/coinwind/common/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const masterChef: Contract = {
  chain: 'bsc',
  address: '0x274c51cd70ba046fca5b11cf9439ea5ece60fec3',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getCoinWindContracts(ctx, masterChef)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getCoinwindBalances(...args, masterChef),
  })

  return {
    groups: [{ balances }],
  }
}
