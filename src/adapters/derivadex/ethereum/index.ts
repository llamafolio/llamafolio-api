import { getDerivaDexBalances } from '@adapters/derivadex/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const controller: Contract = {
  chain: 'ethereum',
  address: '0x6fb8aa6fc6f27e591423009194529ae126660027',
}

export const getContracts = () => {
  return {
    contracts: { controller },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    controller: getDerivaDexBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1616194800,
}
