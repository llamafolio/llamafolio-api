import { getSommelierFarmBalances, getSommelierStakeBalances } from '@adapters/sommelier/ethereum/balance'
import { getSommelierContracts } from '@adapters/sommelier/ethereum/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const pools: Contract[] = [
  { chain: 'ethereum', address: '0x7bad5df5e11151dc5ee1a648800057c5c934c0d5', category: 'stake' },
  { chain: 'ethereum', address: '0x6b7f87279982d919bbf85182ddeab179b366d8f2', category: 'stake' },
  { chain: 'ethereum', address: '0x6e2dac3b9e9adc0cbbae2d0b9fd81952a8d33872', category: 'stake' },
  { chain: 'ethereum', address: '0x4986fd36b6b16f49b43282ee2e24c5cf90ed166d', category: 'stake' },
  { chain: 'ethereum', address: '0x3f07a84ecdf494310d397d24c1c78b041d2fa622', category: 'stake' },
  { chain: 'ethereum', address: '0x05641a27c82799aaf22b436f20a3110410f29652', category: 'stake' },
  { chain: 'ethereum', address: '0x6f069f711281618467dae7873541ecc082761b33', category: 'stake' },
  { chain: 'ethereum', address: '0x97e6e0a40a3d02f12d1cec30ebfbae04e37c119e', category: 'farm' },
  { chain: 'ethereum', address: '0xb5b29320d2dde5ba5bafa1ebcd270052070483ec', category: 'farm' },
  { chain: 'ethereum', address: '0x03df2a53cbed19b824347d6a45d09016c2d1676a', category: 'farm' },
]

const farmers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x8510f22bd1932afb4753b6b3edf5db00c7e7a748',
    token: '0x97e6E0a40a3D02F12d1cEC30ebfbAE04e37C119E',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
  {
    chain: 'ethereum',
    address: '0x955a31153e6764fe892757ace79123ae996b0afb',
    token: '0xb5b29320d2Dde5BA5BAFA1EbcD270052070483ec',
    underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
  },
  {
    chain: 'ethereum',
    address: '0x24691a00779d375a5447727e1610d327d04b3c5f',
    token: '0x7bAD5DF5E11151Dc5Ee1a648800057C5c934c0d5',
    underlyings: ['0xdAC17F958D2ee523a2206206994597C13D831ec7'],
  },
  {
    chain: 'ethereum',
    address: '0x0349b3c56adb9e39b5d75fc1df52eee313dd80d1',
    token: '0x03df2A53Cbed19B824347D6a45d09016C2D1676a',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
  {
    chain: 'ethereum',
    address: '0x9eeabfff5d15e8cedfd2f6c914c8826ba0a5fbbd',
    token: '0x6b7f87279982d919Bbf85182DDeAB179B366D8f2',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
  {
    chain: 'ethereum',
    address: '0x6ce314c39f30488b4a86b8892c81a5b7af83e337',
    token: '0x6E2dAc3b9E9ADc0CbbaE2D0B9Fd81952a8D33872',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
  {
    chain: 'ethereum',
    address: '0xae0e6024972b70601bc35405479af5cd372cc956',
    token: '0x3F07A84eCdf494310D397d24c1C78B041D2fa622',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
  {
    chain: 'ethereum',
    address: '0xd1d02c16874e0714fd825213e0c13eab6dd9c25f',
    token: '0x4986fD36b6b16f49b43282Ee2e24C5cF90ed166d',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
  {
    chain: 'ethereum',
    address: '0x7da7e27e4bcc6ec8bc06349e1cef6634f6df7c5c',
    token: '0x05641a27C82799AaF22b436F20A3110410f29652',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
  {
    chain: 'ethereum',
    address: '0x74a9a6fab61e128246a6a5242a3e96e56198cbdd',
    token: '0x6F069F711281618467dAe7873541EcC082761B33',
    underlyings: ['0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'],
  },
]

export const getContracts = async (ctx: BaseContext) => {
  const poolsContracts = await getSommelierContracts(ctx, pools)

  return {
    contracts: { poolsContracts, farmers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    poolsContracts: getSommelierStakeBalances,
    farmers: getSommelierFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
