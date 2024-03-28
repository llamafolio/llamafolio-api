import { getMMYStakeBalance } from '@adapters/mummy-finance/common/balance'
import { getMMYLPContract } from '@adapters/mummy-finance/common/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vault: Contract = {
  chain: 'fantom',
  address: '0x7e9E9d925846B110B025041cfdF9942f2C401F4F',
}

const fMMY: Contract = {
  chain: 'fantom',
  address: '0xc35208a29ef948395db0f7e58a9c3293a6f42eb5',
}

export const getContracts = async (ctx: BaseContext) => {
  const mmylp = await getMMYLPContract(ctx, fMMY, vault)
  return {
    contracts: { mmylp },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    mmylp: (...args) => getMMYStakeBalance(...args, vault),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1670025600,
}
