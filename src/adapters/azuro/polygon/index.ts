import { getAzuroLpBalances } from '@adapters/azuro/common/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const managers: Contract[] = [
  {
    chain: 'polygon',
    address: '0x7043e4e1c4045424858ecbced80989feafc11b36',
    token: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  },
  {
    chain: 'polygon',
    address: '0x2a838ab9b037db117576db8d0dcc3b686748ef7c',
    token: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  },
]

export const getContracts = () => {
  return {
    contracts: { managers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    managers: getAzuroLpBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1676764800,
}
