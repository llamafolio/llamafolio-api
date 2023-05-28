import { getMagpieBalances, getMGPBalance } from '@adapters/magpie/common/balance'
import { getMagpieContracts } from '@adapters/magpie/common/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const masterChef: Contract = {
  chain: 'bsc',
  address: '0xa3b615667cbd33cfc69843bf11fbb2a1d926bd46',
  rewards: ['0xd06716e1ff2e492cc5034c2e81805562dd3b45fa'],
}

const MGPContract: Contract = {
  chain: 'bsc',
  address: '0x9b69b06272980fa6bad9d88680a71e3c3beb32c6',
  staker: '0x94Eb0E6800F10E22550e104EC04f98F043B6b3ad',
  underlyings: ['0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa'],
  rewards: [
    '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa',
    '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1',
    '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    '0x3BC5AC0dFdC871B365d159f728dd1B9A0B5481E8',
    '0xf307910A4c7bbc79691fD374889b36d8531B08e3',
    '0x4C882ec256823eE773B25b414d36F92ef58a7c0C',
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
    '0x0782b6d8c4551B9760e74c0545a9bCD90bdc41E5',
    '0x027a9d301FB747cd972CFB29A63f3BDA551DFc5c',
  ],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getMagpieContracts(ctx, masterChef)

  return {
    contracts: { masterChef, pools, MGPContract },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getMagpieBalances(...args, masterChef),
    MGPContract: getMGPBalance,
  })

  return {
    groups: [{ balances }],
  }
}
