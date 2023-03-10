import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getFraxBalances } from './balance'
import { getFraxContracts } from './contract'
import contractsLists from './contracts.json'
import { getFraxLockerBalances } from './locker'
import { getStakedFraxBalances } from './staker'

const pools: Contract[] = [
  { chain: 'ethereum', address: '0x03b59bd1c8b9f6c265ba0c3421923b93f15036fa' },
  { chain: 'ethereum', address: '0x56695c26b3cdb528815cd22ff7b47510ab821efd' },
  { chain: 'ethereum', address: '0x07af6bb51d6ad0cf126e3ed2dee6eac34bf094f8' },
  { chain: 'ethereum', address: '0x31351bf3fba544863fbff44ddc27ba880916a199' },
  { chain: 'ethereum', address: '0x2bac101f9769aeff63c63effb4189152e833649f' },
  { chain: 'ethereum', address: '0x832c6f546bf34a552deb8773216a93bf6801028c' },
  { chain: 'ethereum', address: '0x49fd21c5c8813b1bae4e5507c556391d6dd9e9f1' },
  { chain: 'ethereum', address: '0x5769071665eb8db80e7e9226f92336bb2897dcfa' },
  { chain: 'ethereum', address: '0xd79886841026a39cff99321140b3c4d31314782b' },
  { chain: 'ethereum', address: '0x3ecfda4eff6184cd8563772d6d024cb0fb9cbf80' },
  { chain: 'ethereum', address: '0x5e8c1ad4c3d04f059d5c1a2ce4593e53be270bca' },
  { chain: 'ethereum', address: '0x0a92ac70b5a187fb509947916a8f63dd31600f80' },
  { chain: 'ethereum', address: '0x750bb20608601e4c44acbe774fac8f37dab67c86' },
  { chain: 'ethereum', address: '0xf14766a7c44efb7f71441b7114d5dd295b637175' },
  { chain: 'ethereum', address: '0x8300f0528e00ad33b218bb05d396f61a9fdd68cd' },
  { chain: 'ethereum', address: '0x5a1ea0130dc4dc38420aa77929f992f1fbd482bb' },
]

const staker: Contract = {
  chain: 'ethereum',
  address: '0xac3e018457b222d93114458476f3e3416abbe38f',
  decimals: 18,
  symbol: 'sfrxETH',
  underlyings: ['0x5E8422345238F34275888049021821E8E08CAa1f'],
}

const veFXS: Contract = {
  chain: 'ethereum',
  address: '0xc8418af6358ffdda74e09ca9cc3fe03ca6adc5b0',
  decimals: 18,
  symbol: 'veFXS',
  underlyings: ['0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0'],
  rewarder: '0xc6764e58b36e26b08Fd1d2AeD4538c02171fA872',
}

const veFPIS: Contract = {
  chain: 'ethereum',
  address: '0x574c154c83432b0a45ba3ad2429c3fa242ed7359',
  decimals: 18,
  symbol: 'veFPIS',
  underlyings: ['0xc2544A32872A91F4A553b404C6950e89De901fdb'],
  rewarder: '0xE6D31C144BA99Af564bE7E81261f7bD951b802F6',
}

export const getContracts = async (ctx: BaseContext) => {
  const contracts = await getFraxContracts(ctx, contractsLists)
  const pairs = await getPairsDetails(ctx, pools)

  return {
    contracts: { pairs, contracts, staker, lockers: [veFXS, veFPIS] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    contracts: getFraxBalances,
    staker: getStakedFraxBalances,
    lockers: getFraxLockerBalances,
    pairs: getPairsBalances,
  })

  return {
    groups: [{ balances }],
  }
}
