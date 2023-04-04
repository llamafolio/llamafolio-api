import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

import { getRedactedLockerBalances } from './lock'
import { getwxBTRFLYStakeBalances } from './stake'
import { getRedactedVesterBalances } from './vest'

const xBTRFLY: Contract = {
  chain: 'ethereum',
  address: '0xcc94faf235cc5d3bf4bed3a30db5984306c86abc',
  symbol: 'xBTRFLY',
  underlyings: ['0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a'],
  decimals: 9,
}

const wxBTRFLY: Contract = {
  chain: 'ethereum',
  address: '0x4b16d95ddf1ae4fe8227ed7b7e80cf13275e61c9',
  symbol: 'wxBTRFLY',
  underlyings: ['0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a'],
  decimals: 9,
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x742b70151cd3bc7ab598aaff1d54b90c3ebc6027',
  symbol: 'rlBTRFLY',
  underlyings: ['0xc55126051B22eBb829D00368f4B12Bde432de5Da'],
  decimals: 18,
}

const vesters: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xe2ef3b60b0b3087cf1d1179d899a7cd7a11a9fca',
    token: '0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a',
    underlyings: ['0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a'],
  },
  {
    chain: 'ethereum',
    address: '0x765c7cfed02f2d9583eac8229930f3650af42c77',
    token: '0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a',
    underlyings: ['0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a'],
  },
  {
    chain: 'ethereum',
    address: '0x5f81b1c7182543e0db342fc2a69525888d648e60',
    token: '0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a',
    underlyings: ['0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a'],
  },
  {
    chain: 'ethereum',
    address: '0x1fdf1233f85a3bae9594b0558e4ec8febe8c6720',
    token: '0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a',
    underlyings: ['0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a'],
  },
  {
    chain: 'ethereum',
    address: '0x3496681ef5e8ebbf01eeeebae10084343d65dbea',
    token: '0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a',
    underlyings: ['0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a'],
  },
  {
    chain: 'ethereum',
    address: '0x737119790f6e0f85451ab200759f8efa144dcd43',
    token: '0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a',
    underlyings: ['0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a'],
  },
  {
    chain: 'ethereum',
    address: '0x09c97d85c465a188d840e4e9d4a1e077f46f1e37',
    token: '0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a',
    underlyings: ['0xc0d4ceb216b3ba9c3701b291766fdcba977cec3a'],
  },
]

export const getContracts = () => {
  return {
    contracts: { xBTRFLY, wxBTRFLY, locker, vesters },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    xBTRFLY: getSingleStakeBalance,
    wxBTRFLY: getwxBTRFLYStakeBalances,
    locker: getRedactedLockerBalances,
    vesters: getRedactedVesterBalances,
  })

  return {
    groups: [{ balances }],
  }
}
