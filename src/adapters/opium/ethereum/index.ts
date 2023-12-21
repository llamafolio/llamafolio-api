import { getOpiumBalances } from '@adapters/opium/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const wOPIUM: Contract = {
  chain: 'ethereum',
  address: '0x7a8d51b82b36fa5b50fb77001d6d189e920d2f75',
  underlyings: ['0x888888888889c00c67689029d7856aac1065ec11'],
}

const pools: Contract[] = [
  {
    // osETHPool
    chain: 'ethereum',
    address: '0x71add67302162637bedcf47fd39b49fd5d321904',
    token: '0xf1c9acdc66974dfb6decb12aa385b9cd01190e38',
  },
  {
    // inchPool
    chain: 'ethereum',
    address: '0xec5bd46a5085bdfffcf0e89f1029bb0fb59f9ee0',
    token: '0x111111111117dc0aa78b770fa6a738034120c302',
  },
  {
    // opiumPool
    chain: 'ethereum',
    address: '0xc1650f389de9056636d968832eb63382e3970fa1',
    token: '0x888888888889c00c67689029d7856aac1065ec11',
  },
  {
    // usdcPool
    chain: 'ethereum',
    address: '0x5affe41805a9e57fed3657d0e64d96aea0b77885',
    token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  {
    // ethPool
    chain: 'ethereum',
    address: '0x3ee101bf969fac08be892c737d2969b3db38d2b8',
    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  {
    // usdc_v2Pool
    chain: 'ethereum',
    address: '0xbd0375a06afd5c3a0a0ad26f30c4b37629f00d8e',
    token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  {
    // usdc_v3Pool
    chain: 'ethereum',
    address: '0x87b44deaeb02e9026fe26af512decdf7df8b00b1',
    token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
]

export const getContracts = () => {
  return {
    contracts: { wOPIUM, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    wOPIUM: getSingleStakeBalance,
    pools: getOpiumBalances,
  })

  return {
    groups: [{ balances }],
  }
}
