import { getNotionalBalances } from '@adapters/notional/common/balance'
import { getNotionalPools } from '@adapters/notional/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const proxy: Contract = {
  chain: 'ethereum',
  address: '0x1344a36a1b56144c3bc62e7757377d288fde0369',
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0x38de42f4ba8a35056b33a746a6b45be9b1c3b9d2',
  decimals: 18,
  symbol: 'sNOTE',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getNotionalPools(ctx)

  // We need to attach the pools to the proxy since users only interact through the proxy
  proxy.pools = pools

  return {
    contracts: { proxy },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    proxy: (...args) => getNotionalBalances(...args, staker),
  })

  return {
    groups: [{ balances }],
  }
}
