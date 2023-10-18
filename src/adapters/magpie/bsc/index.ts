import { getMagpieBalances, getMGPBalance } from '@adapters/magpie/common/balance'
import { getMagpieContracts } from '@adapters/magpie/common/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const masterChef: Contract = {
  name: 'MasterMagpie',
  chain: 'bsc',
  address: '0xa3b615667cbd33cfc69843bf11fbb2a1d926bd46',
  rewards: ['0xd06716e1ff2e492cc5034c2e81805562dd3b45fa'],
}

const MGPContract: Contract = {
  chain: 'bsc',
  address: '0x9b69b06272980fa6bad9d88680a71e3c3beb32c6',
  staker: '0x94eb0e6800f10e22550e104ec04f98f043b6b3ad',
  underlyings: ['0xd06716e1ff2e492cc5034c2e81805562dd3b45fa'],
  rewards: [
    '0xd06716e1ff2e492cc5034c2e81805562dd3b45fa',
    '0xad6742a35fb341a9cc6ad674738dd8da98b94fb1',
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    '0x3bc5ac0dfdc871b365d159f728dd1b9a0b5481e8',
    '0xf307910a4c7bbc79691fd374889b36d8531b08e3',
    '0x4c882ec256823ee773b25b414d36f92ef58a7c0c',
    '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    '0x0782b6d8c4551b9760e74c0545a9bcd90bdc41e5',
    '0x027a9d301fb747cd972cfb29a63f3bda551dfc5c',
  ],
}

const deployers = ['0x0cdb34e6a4d635142bb92fe403d38f636bbb77b8']

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
