import { getMasterBalances } from '@adapters/magpie/common/balance'
import { getCakepieBalances, getCakepiePools } from '@adapters/magpie/common/cakepie'
import { getMagpiePools, getMasterMagpieBalances } from '@adapters/magpie/common/magpie'
import { getPenpiePools } from '@adapters/magpie/common/penpie'
import { getRadpiePools } from '@adapters/magpie/common/radpie'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
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

const masterCakepie: Contract = {
  chain: 'bsc',
  address: '0x74165b89fd8e9b91a109a4e71662f27eeba61e98',
  rewards: ['0x2B5D9ADea07B590b638FFc165792b2C610EdA649'],
}

const vlMGP: Contract = {
  chain: 'bsc',
  address: '0x9b69b06272980fa6bad9d88680a71e3c3beb32c6',
  token: '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa',
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
  token: '0xad6742a35fb341a9cc6ad674738dd8da98b94fb1',
  rewards: [
    '0xD06716E1Ff2E492Cc5034c2E81805562dd3b45fa',
    '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1',
    '0xFa4BA88Cf97e282c505BEa095297786c16070129',
    '0xd15C444F1199Ae72795eba15E8C1db44E47abF62',
  ],
}

export const getContracts = async (ctx: BaseContext) => {
  const [{ masterChefMagpieWithPools, magpiePools }, penpiePools, cakepiePools, radpiePools] = await Promise.all([
    getMagpiePools(ctx, masterMagpie, [vlMGP, mWOMsv]),
    getPenpiePools(ctx, masterPenpie),
    getCakepiePools(ctx, masterCakepie),
    getRadpiePools(ctx, masterRadpie),
  ])

  return {
    contracts: {
      masterChefMagpieWithPools,
      magpiePools,
      cakepiePools,
      penpiePools,
      radpiePools,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    masterChefMagpieWithPools: getMasterMagpieBalances,
    cakepiePools: (...args) => getCakepieBalances(...args, masterCakepie),
    penpiePools: (...args) => getMasterBalances(...args, masterPenpie),
    radpiePools: (...args) => getMasterBalances(...args, masterRadpie),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1677369600,
}
