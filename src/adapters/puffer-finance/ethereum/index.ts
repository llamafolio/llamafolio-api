import { getPufEthBalance } from '@adapters/puffer-finance/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const pufETH: Contract = {
  chain: 'ethereum',
  address: '0xd9a442856c234a39a81a089c06451ebaa4306a72',
  decimals: 18,
  symbol: 'pufETH',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

export const getContracts = () => {
  return {
    contracts: { pufETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pufETH: getPufEthBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1706745600,
}
