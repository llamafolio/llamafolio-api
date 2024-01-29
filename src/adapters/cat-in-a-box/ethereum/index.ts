import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getCatMarketsBalances } from './lend'
import { getCatStakeBalance, getCatStakeEscrowBalance } from './stake'

const markets: Contract = {
  chain: 'ethereum',
  address: '0x7f0a0c7149a46bf943ccd412da687144b49c6014',
}

const boxFE: Contract = {
  chain: 'ethereum',
  address: '0x320c871b6f7721083604ffdd8070e64c1d3c5d7c',
  token: '0xE4B91fAf8810F8895772E7cA065D4CB889120f94',
  underlyings: ['0x7690202e2C2297bcD03664e31116d1dFfE7e3B73'],
}

const boxFEE: Contract = {
  chain: 'ethereum',
  address: '0xe4b91faf8810f8895772e7ca065d4cb889120f94',
  underlyings: ['0x7690202e2C2297bcD03664e31116d1dFfE7e3B73'],
  decimals: 18,
  symbol: 'boxFEE',
}

const tokensLists: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    category: 'lend',
    decimals: 18,
    symbol: 'stETH',
    underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
  },
  {
    chain: 'ethereum',
    address: '0x7690202e2C2297bcD03664e31116d1dFfE7e3B73',
    category: 'borrow',
    decimals: 18,
    symbol: 'boxETH',
  },
]

export const getContracts = () => {
  return {
    contracts: { markets, boxFE, boxFEE },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: (...args) => getCatMarketsBalances(...args, tokensLists),
    boxFEE: getCatStakeEscrowBalance,
    boxFE: getCatStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1677456000,
}
