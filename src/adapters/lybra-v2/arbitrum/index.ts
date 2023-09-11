import { getLybraFarmBalance } from '@adapters/lybra-v2/arbitrum/farm'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmer: Contract = {
  chain: 'arbitrum',
  address: '0xed1167b6dc64e8a366db86f2e952a482d0981ebd',
  token: '0x1e2ebe2fffa7c9fa83486188f7c19f9acd1bb990',
  underlyings: ['0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', '0xdce765f021410B3266aA0053c93Cb4535F1e12e0'],
}

export const getContracts = () => {
  return {
    contracts: { farmer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmer: getLybraFarmBalance,
  })

  return {
    groups: [{ balances }],
  }
}
