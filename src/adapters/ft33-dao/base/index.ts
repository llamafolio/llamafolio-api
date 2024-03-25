import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const sFTW: Contract = {
  chain: 'ethereum',
  address: '0xbede0ae1a6043c056600eeed0d561de9771ef863',
  underlyings: ['0x3347453ced85bd288d783d85cdec9b01ab90f9d8'],
  decimals: 9,
  symbol: 'sFTW',
}

export const getContracts = () => {
  return {
    contracts: { sFTW },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sFTW: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1696204800,
}
