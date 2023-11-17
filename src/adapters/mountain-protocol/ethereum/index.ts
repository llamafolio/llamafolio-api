import { getMountainBalance } from '@adapters/mountain-protocol/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const wUSDM: Contract = {
  chain: 'ethereum',
  address: '0x57f5e098cad7a3d1eed53991d4d66c45c9af7812',
  decimals: 18,
  symbol: 'wUSDM',
}

export const getContracts = () => {
  return {
    contracts: { wUSDM },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    wUSDM: getMountainBalance,
  })

  return {
    groups: [{ balances }],
  }
}
