import { getCopraBalances } from '@adapters/copra-finance/arbitrum/balance'
import { getCopraPools } from '@adapters/copra-finance/arbitrum/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const creditAccountFactory: Contract = {
  chain: 'arbitrum',
  address: '0x2eaA3A5223FCb7A9EeC3bFCD399A4c479c6008f6',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getCopraPools(ctx, creditAccountFactory)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getCopraBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1710547200,
}
