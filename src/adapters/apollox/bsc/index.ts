import { getApolloFarmBalances, getApolloStakeBalances } from '@adapters/apollox/bsc/balance'
import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'bsc',
  address: '0x1b6f2d3844c6ae7d56ceb3c3643b9060ba28feb0',
  token: '0x4e47057f45adf24ba41375a175da0357cb3480e5',
  underlyings: [
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    '0xe9e7cea3dedca5984780bafc599bd69add087d56',
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
    '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    '0x55d398326f99059ff775485246999027b3197955',
  ],
}

const alpxlpStakings: Contract[] = [
  {
    chain: 'bsc',
    address: '0x60d910f9de5c6fd2171716042af2fd3d2aa9d942',
    token: '0xaf839f4d3620a1eed00ccc21ddc01119c26a75e1',
    underlyings: ['0x78f5d389f5cdccfc41594abab4b0ed02f31398b3', '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c'],
    rewards: ['0x78f5d389f5cdccfc41594abab4b0ed02f31398b3'],
  },
  {
    chain: 'bsc',
    address: '0x7eb5af418f199ea47494023c3a8b83a210f8846f',
    token: '0xa0ee789a8f581cb92dd9742ed0b5d54a0916976c',
    underlyings: ['0x78f5d389f5cdccfc41594abab4b0ed02f31398b3', '0xe9e7cea3dedca5984780bafc599bd69add087d56'],
    rewards: ['0x78f5d389f5cdccfc41594abab4b0ed02f31398b3'],
  },
]

export const getContracts = () => {
  return {
    contracts: { staker, alpxlpStakings },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getApolloStakeBalances,
    alpxlpStakings: getApolloFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
