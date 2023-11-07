import { getMasterMagpieBalances } from '@adapters/magpie/common/balance'
import { getMagpiePools, getPenpiePools, getRadpiePools } from '@adapters/magpie/common/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const masterMagpie: Contract = {
  chain: 'bsc',
  address: '0xa3b615667cbd33cfc69843bf11fbb2a1d926bd46',
  rewards: ['0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa'],
}
const masterPenpie: Contract = {
  chain: 'bsc',
  address: '0xb35b3d118c0394e750b4b59d2a2f9307393cd5db',
  rewards: ['0x5012c90f14d190607662ca8344120812aaa2639d'],
}

const masterRadpie: Contract = {
  chain: 'bsc',
  address: '0x1b80eec9b25472c6119ead3b880976fa62e58453',
  rewards: ['0xf7de7e8a6bd59ed41a4b5fe50278b3b7f31384df'],
}

const vlMGP: Contract = {
  chain: 'bsc',
  address: '0x9b69b06272980fa6bad9d88680a71e3c3beb32c6',
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

const mWOMsv: Contract = {
  chain: 'bsc',
  address: '0x2130df9dba40afefca4c9b145f5ed095335c5fa3',
  underlyings: ['0xad6742a35fb341a9cc6ad674738dd8da98b94fb1'],
  rewards: [
    '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa',
    '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1',
    '0xFa4BA88Cf97e282c505BEa095297786c16070129',
    '0xd15C444F1199Ae72795eba15E8C1db44E47abF62',
  ],
}

export const getContracts = async (ctx: BaseContext) => {
  const [magpiePools, penpiePools, radpiePools] = await Promise.all([
    getMagpiePools(ctx, masterMagpie),
    getPenpiePools(ctx, masterPenpie),
    getRadpiePools(ctx, masterRadpie),
  ])

  return {
    contracts: {
      magpiePools: [...magpiePools, vlMGP, mWOMsv],
      penpiePools,
      radpiePools,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    magpiePools: (...args) => getMasterMagpieBalances(...args, masterMagpie),
    penpiePools: (...args) => getMasterMagpieBalances(...args, masterPenpie),
    radpiePools: (...args) => getMasterMagpieBalances(...args, masterRadpie),
  })

  return {
    groups: [{ balances }],
  }
}
