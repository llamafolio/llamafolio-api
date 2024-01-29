import { getCentrifugeBalances } from '@adapters/centrifuge/ethereum/balance'
import { getCentrifugePools } from '@adapters/centrifuge/ethereum/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

// https://docs.centrifuge.io/build/tinlake/#lender-contracts

const DAI: Contract = {
  chain: 'ethereum',
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  decimals: 18,
  symbol: 'DAI',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getCentrifugePools(ctx)

  return {
    contracts: { pools, DAI },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    DAI: getCentrifugeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1602979200,
}
