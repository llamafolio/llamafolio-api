import { getPieDaoFarmBalances } from '@adapters/piedao/ethereum/farm'
import { getPieDaoLockerBalances } from '@adapters/piedao/ethereum/lock'
import { getPieDaoStakeBalances } from '@adapters/piedao/ethereum/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const DOUGH: Token = {
  chain: 'ethereum',
  address: '0xad32A8e6220741182940c5aBF610bDE99E737b2D',
  decimals: 18,
  symbol: 'DOUGH',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x6bd0d8c8ad8d3f1f97810d5cc57e9296db73dc45',
  token: '0xad32A8e6220741182940c5aBF610bDE99E737b2D',
}

const stakers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xaedec86dede3ded9562fb00ada623c0e9beeb951',
    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  {
    chain: 'ethereum',
    address: '0x0c4ff8982c66cd29ea7ea96d985f36ae60b85b1c',
    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  {
    chain: 'ethereum',
    address: '0x1d616dad84dd0b3ce83e5fe518e90617c7ae3915',
    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
  {
    chain: 'ethereum',
    address: '0xe3d74df89163a8fa1cba540ff6b339d13d322f61',
    token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  },
]

const farmer: Contract = {
  chain: 'ethereum',
  address: '0x6de77a304609472a4811a0bfd47d8682aebc29df',
}

const pools: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xaf491D603DB3c1138a5ee5DB35Eb0C7b6c4541a2',
    underlyings: ['0x33e18a092a93ff21aD04746c7Da12e35D34DC7C4', '0xad32A8e6220741182940c5aBF610bDE99E737b2D'],
    rewards: [DOUGH],
    provider: 'sushi',
    pid: 0,
  },
  {
    chain: 'ethereum',
    address: '0x97f34c8E5992EB985c5F740e7EE8c7e48a1de76a',
    underlyings: ['0xad32A8e6220741182940c5aBF610bDE99E737b2D', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
    rewards: [DOUGH],
    provider: 'sushi',
    pid: 1,
  },
  {
    chain: 'ethereum',
    address: '0xFAE2809935233d4BfE8a56c2355c4A2e7d1fFf1A',
    underlyings: ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', '0xad32A8e6220741182940c5aBF610bDE99E737b2D'],
    rewards: [DOUGH],
    provider: 'balancer',
    pid: 2,
  },
  {
    chain: 'ethereum',
    address: '0x35333CF3Db8e334384EC6D2ea446DA6e445701dF',
    underlyings: ['0xaD6A626aE2B43DCb1B39430Ce496d2FA0365BA9C', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
    rewards: [DOUGH],
    provider: 'balancer',
    pid: 3,
  },
  {
    chain: 'ethereum',
    address: '0xA795600590a7da0057469049ab8f1284BAed977E',
    underlyings: ['0x78F225869c08d478c34e5f645d07A87d3fe8eb78', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
    rewards: [DOUGH],
    provider: 'balancer',
    pid: 4,
  },
  {
    chain: 'ethereum',
    address: '0xE4f726Adc8e89C6a6017F01eadA77865dB22dA14',
    underlyings: [
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      '0x8d1ce361eb68e9e05573443c407d4a3bed23b033',
    ],
    rewards: [DOUGH],
    provider: 'pie',
    pid: 5,
  },
]

export const getContracts = () => {
  return {
    contracts: { stakers, pools, farmer, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getPieDaoStakeBalances,
    pools: (...args) => getPieDaoFarmBalances(...args, farmer),
    locker: getPieDaoLockerBalances,
  })

  return {
    groups: [{ balances }],
  }
}
