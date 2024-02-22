import { getSolidBalances } from '@adapters/solid-world/polygon/balance'
import { getSolidContract } from '@adapters/solid-world/polygon/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const controller: Contract = {
  chain: 'polygon',
  address: '0xad7ce5cf8e594e1efc6922ab2c9f81d7a0e14337',
}

const rewardController: Contract = {
  chain: 'polygon',
  address: '0x291705e9e4338cfc75C041E3Db1DF0591EeD0666',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSolidContract(ctx, controller, rewardController)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getSolidBalances(...args, controller, rewardController),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1684540800,
}
