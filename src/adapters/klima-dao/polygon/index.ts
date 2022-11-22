import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getFormattedStakeBalances, getStakeBalances } from '../common/stake'

const KLIMA: Contract = {
  name: 'Klima DAO',
  displayName: 'Klima DAO',
  chain: 'polygon',
  address: '0x4e78011Ce80ee02d2c3e649Fb657E45898257815',
  symbol: 'KLIMA',
  decimals: 9,
}

const sKLIMA: Contract = {
  name: 'Staked Klima',
  chain: 'polygon',
  address: '0xb0C22d8D350C67420f06F48936654f567C73E8C8',
  symbol: 'sKLIMA',
  decimals: 9,
  underlyings: [KLIMA],
}
const wsKLIMA: Contract = {
  name: 'Wrapped KLIMA',
  chain: 'polygon',
  address: '0x6f370dba99E32A3cAD959b341120DB3C9E280bA6',
  symbol: 'wsKLIMA',
  decimals: 18,
  underlyings: [KLIMA],
}

export const getContracts = () => {
  return {
    contracts: { sKLIMA, wsKLIMA },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'polygon', contracts, {
    sKLIMA: getStakeBalances,
    wsKLIMA: getFormattedStakeBalances,
  })

  return {
    balances,
  }
}
