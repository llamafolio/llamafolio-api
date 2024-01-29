import { getKineFarmingBalances, getKineFarmingPools } from '@adapters/kine-finance/common/farm'
import { getKineLpBalances, getKineLpPools } from '@adapters/kine-finance/common/lp'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

// https://kine.gitbook.io/kine-docs-portal/whitepaper/contract-address

const KETH: Contract = {
  chain: 'ethereum',
  address: '0xa58e822De1517aAE7114714fB354Ee853Cd35780',
  underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
}

const xKINE: Contract = {
  chain: 'ethereum',
  address: '0xa8d7643324df0f38764f514eb1a99d8f379cc692',
  underlyings: ['0xCbfef8fdd706cde6F208460f2Bf39Aa9c785F05D'],
}

const lpAddresses: `0x${string}`[] = [
  '0x1568A7f0bdf67D37DC963c345Dbc4A598859ebA3',
  '0x377f100a7280dd992C6F2503330f893620F586aB',
  '0x63B63b5f0Ae8057cb8f704F65Fd91c19BadD5A73',
  '0x473ccDeC83B7125a4F52Aa6F8699026FCB878eE8',
]

const farmAddresses: `0x${string}`[] = [
  '0x80850DB68db03792CA5650fbdacCeBe1DA5e52bF',
  '0x834C3bB26bb1Bf025dc6B66aD5D7F9003333606b',
  '0xc75ba7E3A40E2293817b590e47BEb01e52A0C9b6',
]

export const getContracts = async (ctx: BaseContext) => {
  const [LPs, pools] = await Promise.all([getKineLpPools(ctx, lpAddresses), getKineFarmingPools(ctx, farmAddresses)])

  return {
    contracts: { LPs: [KETH, xKINE, ...LPs], pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    LPs: getKineLpBalances,
    pools: getKineFarmingBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1644537600,
}
