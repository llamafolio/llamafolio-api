import { Adapter, Contract, GetBalancesHandler } from '@lib/adapter'

import { getIFOBalances } from './ifo'

const concentratorIFOContract: Contract = {
  name: 'ConcentratorIFO',
  displayName: 'Concentrator IFO',
  chain: 'ethereum',
  address: '0x3cf54f3a1969be9916dad548f3c084331c4450b5',
}

const getContracts = () => {
  return {
    contracts: { concentratorIFOContract },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, { concentratorIFOContract }) => {
  if (concentratorIFOContract) {
    return {
      balances: await getIFOBalances(ctx, 'ethereum'),
    }
  }

  return { balances: [] }
}

const adapter: Adapter = {
  id: 'concentrator',
  getContracts,
  getBalances,
}

export default adapter
