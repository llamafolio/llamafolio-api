import { getStaderFarmBalances } from '@adapters/stader/bsc/farm'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const BNBx: Contract = {
  chain: 'bsc',
  address: '0x1bdd3cf7f79cfb8edbb955f20ad99211551ba275',
  decimals: 18,
  symbol: 'BNBx',
}

const bnbXFarm: Contract = {
  chain: 'bsc',
  address: '0x7276241a669489e4bbb76f63d2a43bfe63080f2f',
  token: '0x1bdd3cf7f79cfb8edbb955f20ad99211551ba275',
}

export const getContracts = () => {
  return {
    contracts: { BNBx, bnbXFarm },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    BNBx: getSingleStakeBalance,
    bnbXFarm: getStaderFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1659830400,
}
