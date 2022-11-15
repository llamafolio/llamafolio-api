import { Adapter, Contract, GetBalancesHandler } from '@lib/adapter'

import { getFormattedStakeBalances, getStakeBalances } from './balances'

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

const getContracts = () => {
  return {
    contracts: { sKLIMA, wsKLIMA },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { sKLIMA, wsKLIMA }) => {
  const [stakeBalances, formattedBalance] = await Promise.all([
    getStakeBalances(ctx, 'polygon', sKLIMA),
    getFormattedStakeBalances(ctx, 'polygon', wsKLIMA),
  ])

  const balances = [...stakeBalances, ...formattedBalance]

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'klima-dao',
  getContracts,
  getBalances,
}

export default adapter
