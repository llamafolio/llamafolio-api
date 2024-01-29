import { getFlorenceBalances } from '@adapters/florence-finance/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const farmers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x7c830b876e2c9026ceea78f391e6a6879dd7cb00',
    underlyings: ['0x5E5d9aEeC4a6b775a175b883DCA61E4297c14Ecb'],
  },
  {
    chain: 'ethereum',
    address: '0x6446f112c48a9e0d68313e6a44357eb8362893c3',
    underlyings: ['0x5E5d9aEeC4a6b775a175b883DCA61E4297c14Ecb'],
  },
]

export const getContracts = () => {
  return {
    contracts: { farmers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    farmers: getFlorenceBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1688428800,
}
