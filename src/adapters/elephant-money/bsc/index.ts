import { getElephantFarmBalances } from '@adapters/elephant-money/bsc/farmer'
import {
  getElephantStakeBalances,
  getElephantTrumpetBalance,
  getElephantTrunkBalance,
} from '@adapters/elephant-money/bsc/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const trunkStaker: Contract = {
  chain: 'bsc',
  address: '0x7c4dad1b249efdc998f3569c8537866639b914b7',
  token: '0xdd325c38b12903b727d16961e61333f4871a70e0',
}

const trumpetStaker: Contract = {
  chain: 'bsc',
  address: '0x574a691d05eee825299024b2de584b208647e073',
  token: '0xdd325c38b12903b727d16961e61333f4871a70e0',
}

const stakers: Contract[] = [
  {
    chain: 'bsc',
    address: '0x564d4126af2b195ffaa7fb470ed658b1d9d07a54',
    token: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    rewards: ['0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'],
  },
  {
    chain: 'bsc',
    address: '0xec10059ba900883ed6154883e9f3a1c24fce1eb7',
    token: '0xdd325c38b12903b727d16961e61333f4871a70e0',
    rewards: ['0xdd325c38b12903b727d16961e61333f4871a70e0'],
  },
  {
    chain: 'bsc',
    address: '0x83ad16274c8bdd547582de02db25a81a7a33759f',
    token: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    rewards: ['0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c'],
  },
  {
    chain: 'bsc',
    address: '0x599640ddacb546b1446fa149f4a9ceecd3fcc87a',
    token: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    rewards: ['0xe9e7cea3dedca5984780bafc599bd69add087d56'],
  },
  {
    chain: 'bsc',
    address: '0xd397f06eecd4eb9af0492874be0d24d67560ff69',
    token: '0x190b589cf9fb8ddeabbfeae36a813ffb2a702454',
    rewards: ['0x190b589cf9fb8ddeabbfeae36a813ffb2a702454'],
  },
]

const farmer: Contract = {
  chain: 'bsc',
  address: '0x71b00a9c9cc1902efddd6ba28850f6f34f5938ed',
  underlyings: [
    '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    '0x55d398326f99059ff775485246999027b3197955',
    '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
    '0xba2ae424d960c26247dd6c32edc70b295c744c43',
    '0xcc42724c6683b7e57334c4e856f4c9965ed682bd',
    '0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe',
    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
    '0x3ee2200efb3400fabb9aacf31297cbdd1d435d47',
  ],
}

export const getContracts = async (_ctx: BaseContext) => {
  return {
    contracts: { stakers, trunkStaker, trumpetStaker, farmer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getElephantStakeBalances,
    trunkStaker: getElephantTrunkBalance,
    trumpetStaker: getElephantTrumpetBalance,
    farmer: getElephantFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
