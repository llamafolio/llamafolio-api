import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getFraxBalances } from './balance'

const pools: Contract[] = [
  { chain: 'arbitrum', address: '0x90ff2b6b6a2eb3c68d883bc276f6736b1262fa50' },
  { chain: 'arbitrum', address: '0x0bb5a573886bbcecf18590b6cb59e980fac7d278' },
]

const VST_FRAX: Contract = {
  chain: 'arbitrum',
  address: '0x59bf0545fca0e5ad48e13da269facd2e8c886ba4',
  lpToken: '0x59bf0545fca0e5ad48e13da269facd2e8c886ba4',
  stakeAddress: '0x127963a74c07f72d862f2bdc225226c3251bd117',
  provider: 'curve',
  underlyings: ['0x64343594Ab9b56e99087BfA6F2335Db24c2d1F17', '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F'],
  rewards: ['0x9d2f299715d94d8a7e6f5eaa8e654e8c74a988a7', '0xa684cd057951541187f288294a1e1c2646aa2d24'],
  decimals: 18,
}

const L2D4: Contract = {
  chain: 'arbitrum',
  address: '0x147d0af556c6d89640bfa915d2b9619d7b55947a',
  lpToken: '0x147d0af556c6d89640bfa915d2b9619d7b55947a',
  stakeAddress: '0xd1df24e8d225b20f9c8f4912be88cccec93f36e5',
  provider: 'saddle',
  underlyings: [
    '0x17fc002b466eec40dae837fc4be5c67993ddbd6f',
    '0xCB8FA9a76b8e203D8C3797bF438d8FB81Ea3326A',
    '0x641441c631e2F909700d2f41FD87F0aA6A6b4EDb',
    '0xD74f5255D557944cf7Dd0E45FF521520002D5748',
  ],
  swapper: '0xF2839E0b30B5e96083085F498b14bbc12530b734',
  rewards: ['0x9d2f299715d94d8a7e6f5eaa8e654e8c74a988a7', '0x75c9bc761d88f70156daf83aa010e84680baf131'],
  decimals: 18,
}

export const getContracts = async (ctx: BaseContext) => {
  const pairs = await getPairsDetails(ctx, pools)

  return {
    contracts: { pairs, farmers: [VST_FRAX, L2D4] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    farmers: getFraxBalances,
  })

  return {
    groups: [{ balances }],
  }
}
