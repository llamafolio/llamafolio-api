import { Contract, GetBalancesHandler } from '@lib/adapter'

import { getFormattedStakeBalances, getStakeBalances } from '../common/stake'

const TIME: Contract = {
  name: 'Time',
  displayName: 'Time Token',
  chain: 'avax',
  address: '0xb54f16fb19478766a268f172c9480f8da1a7c9c3',
  decimals: 9,
  symbol: 'TIME',
}

const wMEMO: Contract = {
  name: 'Wrapped MEMO',
  displayName: 'Wrapped MEMO',
  chain: 'avax',
  address: '0x0da67235dd5787d67955420c84ca1cecd4e5bb3b',
  decimals: 18,
  symbol: 'wMEMO ',
  underlyings: [TIME],
}

const wMemoFarm: Contract = {
  name: 'Multirewards',
  chain: 'avax',
  address: '0xC172c84587bEa6d593269bFE08632bf2Da2Bc0f6',
  token: wMEMO,
}

export const getContracts = () => {
  return {
    contracts: { wMEMO, wMemoFarm },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { wMEMO, wMemoFarm }) => {
  const [formattedStakeBalances, farmBalances] = await Promise.all([
    getFormattedStakeBalances(ctx, 'avax', wMEMO),
    getStakeBalances(ctx, 'avax', wMemoFarm),
  ])

  const balances = [...formattedStakeBalances, ...farmBalances]

  return {
    balances,
  }
}
