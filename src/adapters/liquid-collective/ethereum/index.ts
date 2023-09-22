import { getLiquidBalance } from '@adapters/liquid-collective/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const LsETH: Contract = {
  chain: 'ethereum',
  address: '0x8c1bed5b9a0928467c9b1341da1d7bd5e10b6549',
  decimals: 18,
  symbol: 'LsETH',
}

export const getContracts = () => {
  return {
    contracts: { LsETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    LsETH: getLiquidBalance,
  })

  return {
    groups: [{ balances }],
  }
}
