import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getPVAFarmBalances } from './farm'

const PVA: Contract = {
  chain: 'arbitrum',
  address: '0x5a572b5fbbc43387b5ef8de2c4728a4108ef24a6',
  underlyings: ['0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'],
  decimals: 18,
  symbol: 'PVA',
}

export const getContracts = () => {
  return {
    contracts: { PVA },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    PVA: getPVAFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
