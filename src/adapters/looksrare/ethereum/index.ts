import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getCompounderBalances, getStakeBalances } from './balances'

const WETH: Contract = {
  name: 'Wrapped Ether',
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbols: 'WETH',
}

const staking: Contract = {
  name: 'FeeSharingSystem',
  chain: 'ethereum',
  address: '0xbcd7254a1d759efa08ec7c3291b2e85c5dcc12ce',
  rewards: [WETH],
}

const compounder: Contract = {
  name: 'AggregatorFeeSharingWithUniswapV3',
  chain: 'ethereum',
  address: '0x3ab16af1315dc6c95f83cbf522fecf98d00fd9ba',
}

export const getContracts = () => {
  return {
    contracts: { staking, compounder },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staking: getStakeBalances,
    compounder: getCompounderBalances,
  })

  return {
    balances,
  }
}
