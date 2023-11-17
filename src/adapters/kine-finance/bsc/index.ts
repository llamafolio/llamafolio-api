import { getKineFarmingBalances, getKineFarmingPools } from '@adapters/kine-finance/common/farm'
import { getKineLpBalances, getKineLpPools } from '@adapters/kine-finance/common/lp'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

// https://kine.gitbook.io/kine-docs-portal/whitepaper/contract-address

const KBNB: Contract = {
  chain: 'bsc',
  address: '0x5FBe4eB536DADBcee54d5b55eD6559E29C60B055',
  underlyings: ['0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'],
}

const xKINE: Contract = {
  chain: 'bsc',
  address: '0x8f5abd0d891d293b13f854700ff89210da3d5ba3',
  underlyings: ['0xbFa9dF9ed8805E657D0FeaB5d186c6a567752D7F'],
}

const lpAddresses: `0x${string}`[] = [
  '0x3A8502FD810Df171D327e080fB39C734c79B57C2',
  '0x670076F14fb7Bc9735Af1BC9a1D1ad5266f54FA0',
  '0xD61867501b821befd5E4270A91836f8F7424B847',
  '0xf8c7B7709Dd106e70133474BdF05d9d5a87C871f',
  '0x1cd0d5c1040f8adbbeb1df24ccabe5add4cb5707',
]

const farmAddresses: `0x${string}`[] = [
  '0x6c2C7C5b5c0B60a13B981ACCFe1aa1616985d3D7',
  '0x308043A2a7c62B17906F9B074a349c43ccD919ad',
]

export const getContracts = async (ctx: BaseContext) => {
  const [LPs, pools] = await Promise.all([getKineLpPools(ctx, lpAddresses), getKineFarmingPools(ctx, farmAddresses)])

  return {
    contracts: { LPs: [KBNB, xKINE, ...LPs], pools },
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
