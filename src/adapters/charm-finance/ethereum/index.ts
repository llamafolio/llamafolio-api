import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getCharmStakeBalances } from './staker'

const WBTC_USDC: Contract = {
  chain: 'ethereum',
  address: '0xbd7c6d2ede836b6b27c461799c4e9ecb8f4e8a66',
  decimals: 18,
  symbol: 'AV',
  underlyings: ['0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
}

const USDC_WETH: Contract = {
  chain: 'ethereum',
  address: '0x9bf7b46c7ad5ab62034e9349ab912c0345164322',
  decimals: 18,
  symbol: 'AV',
  underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
}

const WETH_USDT: Contract = {
  chain: 'ethereum',
  address: '0xe72f3e105e475d7db3a003ffa377afae9c2c6c11',
  decimals: 18,
  symbol: 'AV',
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xdAC17F958D2ee523a2206206994597C13D831ec7'],
}
const USDT_WETH: Contract = {
  chain: 'ethereum',
  address: '0x55535c4c56f6bf373e06c43e44c0356aafd0d21a',
  decimals: 18,
  symbol: 'AV',
  underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xdAC17F958D2ee523a2206206994597C13D831ec7'],
}

export const getContracts = () => {
  return {
    contracts: { stakers: [WBTC_USDC, USDC_WETH, WETH_USDT, USDT_WETH] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getCharmStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
