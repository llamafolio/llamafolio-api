import { getSBNBBalance } from '@adapters/synclub-staked-bnb/bsc/stake'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'bsc',
  address: '0xb0b84d294e0c75a6abe60171b70edeb2efd14a1b',
  converter: '0x1adB950d8bB3dA4bE104211D5AB038628e477fE6',
  underlyings: ['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'],
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getSBNBBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1691366400,
}
