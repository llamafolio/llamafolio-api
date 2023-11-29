import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import {
  getCompounderV1Balances,
  getCompounderV2Balances,
  getFarmBalances,
  getStakeV1Balances,
  getStakeV2Balances,
} from './balances'

const WETH: Contract = {
  name: 'Wrapped Ether',
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbol: 'WETH',
}

const stakingV1: Contract = {
  name: 'FeeSharingSystem',
  chain: 'ethereum',
  address: '0xbcd7254a1d759efa08ec7c3291b2e85c5dcc12ce',
  rewards: [WETH],
}

const stakingV2: Contract = {
  name: 'StakingRewards',
  chain: 'ethereum',
  address: '0x0000000000017b2a2a6a336079Abc67f6f48aB9A',
  rewards: [WETH],
}

const compounderV1: Contract = {
  name: 'AggregatorFeeSharingWithUniswapV3',
  chain: 'ethereum',
  address: '0x3ab16af1315dc6c95f83cbf522fecf98d00fd9ba',
}

const compounderV2: Contract = {
  name: 'AutoCompounder',
  chain: 'ethereum',
  address: '0x000000000077Ee1fCFE351dF1Ff22736e995806B',
}

const farmer: Contract = {
  chain: 'ethereum',
  address: '0x2a70e7f51f6cd40c3e9956aa964137668cbfadc5',
  token: '0xDC00bA87Cc2D99468f7f34BC04CBf72E111A32f7',
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xf4d2888d29D722226FafA5d9B24F9164c092421E'],
}

export const getContracts = () => {
  return {
    contracts: { stakingV1, stakingV2, compounderV1, compounderV2, farmer },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakingV1: getStakeV1Balances,
    stakingV2: getStakeV2Balances,
    compounderV1: getCompounderV1Balances,
    compounderV2: getCompounderV2Balances,
    farmer: getFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
