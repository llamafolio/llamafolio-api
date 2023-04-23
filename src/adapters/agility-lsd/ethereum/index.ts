import { BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getAgilityLockerBalances } from './lock'
import { getAgilityStakeBalances } from './stake'

const esAGI: Contract = {
  chain: 'ethereum',
  address: '0x801C71A771E5710D41AC4C0F1d6E82bd07B5Fa43',
  decimals: 18,
  symbol: 'esAGI',
  underlyings: ['0x5F18ea482ad5cc6BC65803817C99f477043DcE85'],
  category: 'lock',
}

const stakers: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xB3db4e3238c1656fb6b832FB692643f4Fa452010',
    token: '0x0000000000000000000000000000000000000000',
    underlyings: undefined,
    rewarder: esAGI,
    rewards: ['0x5F18ea482ad5cc6BC65803817C99f477043DcE85'],
  },
  {
    chain: 'ethereum',
    address: '0xEFd8a0b5e0e01A95fCc15656DAd61D5B5436B2b4',
    token: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    underlyings: undefined,
    rewarder: esAGI,
    rewards: ['0x5F18ea482ad5cc6BC65803817C99f477043DcE85'],
  },
  {
    chain: 'ethereum',
    address: '0xabb828565d46F9Db074d55241D82621B129bcF16',
    token: '0x5E8422345238F34275888049021821E8E08CAa1f',
    underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
    rewarder: esAGI,
    rewards: ['0x5F18ea482ad5cc6BC65803817C99f477043DcE85'],
  },
  {
    chain: 'ethereum',
    address: '0x9775F32737f141AB1b661dD83F7afdf4ef749F3D',
    token: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    underlyings: undefined,
    rewarder: esAGI,
    rewards: ['0x5F18ea482ad5cc6BC65803817C99f477043DcE85'],
  },
  {
    chain: 'ethereum',
    address: '0x5d5897797287a3c2552251A9D9185E09dd25b558',
    token: '0xE95A203B1a91a908F9B9CE46459d101078c2c3cb',
    underlyings: undefined,
    rewarder: esAGI,
    rewards: ['0x5F18ea482ad5cc6BC65803817C99f477043DcE85'],
  },
]

const lpStaker: Contract = {
  chain: 'ethereum',
  address: '0xC8187048f7Ab0db0774b674fEf3f4F4285A01bF4',
  token: '0x498c00E1ccC2AFFf80F6Cc6144EAEB95c46cc3B5',
  underlyings: ['0x5F18ea482ad5cc6BC65803817C99f477043DcE85', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
  rewarder: '0x801C71A771E5710D41AC4C0F1d6E82bd07B5Fa43',
  rewards: ['0x5F18ea482ad5cc6BC65803817C99f477043DcE85'],
}

export const getContracts = () => {
  return {
    contracts: { contracts: [...stakers, lpStaker, esAGI] },
  }
}

const getAgilityBalances = async (ctx: BalancesContext, contracts: Contract[]) => {
  return Promise.all([getAgilityStakeBalances(ctx, contracts), getAgilityLockerBalances(ctx, esAGI)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    contracts: getAgilityBalances,
  })

  return {
    groups: [{ balances }],
  }
}
