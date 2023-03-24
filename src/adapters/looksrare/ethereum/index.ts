import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getCompounderBalances, getFarmBalances, getStakeBalances } from './balances'

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

const farmer: Contract = {
  chain: 'ethereum',
  address: '0x2a70e7f51f6cd40c3e9956aa964137668cbfadc5',
  token: '0xDC00bA87Cc2D99468f7f34BC04CBf72E111A32f7',
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xf4d2888d29D722226FafA5d9B24F9164c092421E'],
}

export const getContracts = () => {
  return {
    contracts: { staking, compounder, farmer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staking: getStakeBalances,
    compounder: getCompounderBalances,
    farmer: getFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
