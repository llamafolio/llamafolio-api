import { getTrufinBalance } from '@adapters/trufin-protocol/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'ethereum',
  address: '0xa43a7c62d56df036c187e1966c03e2799d8987ed',
  underlyings: ['0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0'],
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getTrufinBalance,
  })

  return {
    groups: [{ balances }],
  }
}
