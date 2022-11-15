import { Adapter, Contract, GetBalancesHandler } from '@lib/adapter'

import { getStakeBalances } from './balances'

const NMS: Contract = {
  name: 'Nemesis DAO',
  chain: 'bsc',
  address: '0x8AC9DC3358A2dB19fDd57f433ff45d1fc357aFb3',
  decimals: 9,
  symbol: 'NMS',
}

const sNMS: Contract = {
  name: 'Staked Nemesis',
  chain: 'bsc',
  address: '0xb91bfdb8b41120586ccb391f5cee0dae4482334f',
  decimals: 9,
  symbol: 'sNMS ',
  underlyings: [NMS],
}

const getContracts = async () => {
  return {
    contracts: { sNMS },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { sNMS }) => {
  const balances = await getStakeBalances(ctx, 'bsc', sNMS)

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'nemesis-dao',
  getContracts,
  getBalances,
}

export default adapter
