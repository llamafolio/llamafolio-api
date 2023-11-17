import { getKineFarmingBalances, getKineFarmingPools } from '@adapters/kine-finance/common/farm'
import { getKineLpBalances, getKineLpPools } from '@adapters/kine-finance/common/lp'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

// https://kine.gitbook.io/kine-docs-portal/whitepaper/contract-address

const KMATIC: Contract = {
  chain: 'polygon',
  address: '0xf186A66C2Bd0509BeaAFCa2A16D6c39bA02425f9',
  underlyings: ['0x0000000000000000000000000000000000001010'],
}

const xKINE: Contract = {
  chain: 'polygon',
  address: '0xa8d7643324df0f38764f514eb1a99d8f379cc692',
  underlyings: ['0xCbfef8fdd706cde6F208460f2Bf39Aa9c785F05D'],
}

const lpAddresses: `0x${string}`[] = [
  '0x4F6A33b62017dc804866e6b564C32ed5A57C49Cd',
  '0x96f4516a9d150574cb6d8ae3380f28f330e64ef7',
  '0xc903e8a6811f5e4354ec530F34CC90Bd820Ac1B4',
  '0x3770EbFAeA8376e5f62397FDCE0135D840f0B259',
  '0x6c0ED47f567071Db4207BdFF4F241aF67E972D91',
]

const farmAddresses: `0x${string}`[] = [
  '0x4D7242a89877Eb044fcCBA6c49E96B4e032a8636',
  '0x69c78C26f272405599382925689D0A54B8Ceedf9',
]

export const getContracts = async (ctx: BaseContext) => {
  const [LPs, pools] = await Promise.all([getKineLpPools(ctx, lpAddresses), getKineFarmingPools(ctx, farmAddresses)])

  return {
    contracts: { LPs: [KMATIC, xKINE, ...LPs], pools },
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
