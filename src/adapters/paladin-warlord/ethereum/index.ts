import { getStakedWarlordBalance, getWarlordBalance } from '@adapters/paladin-warlord/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const war: Contract = {
  chain: 'ethereum',
  address: '0xa8258deE2a677874a48F5320670A869D74f0cbC1',
  decimals: 18,
  symbol: 'WAR',
}

const stkWAR: Contract = {
  chain: 'ethereum',
  address: '0xa8258deE2a677874a48F5320670A869D74f0cbC1',
  decimals: 18,
  symbol: 'stkWAR',
  underlyings: [war],
}

export const getContracts = () => {
  return {
    contracts: { war, stkWAR },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    war: getWarlordBalance,
    stkWAR: getStakedWarlordBalance,
  })

  return {
    groups: [{ balances }],
  }
}
