import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'
import { getPairsContracts, Pair } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getPancakeMasterChefPoolsBalances } from './lp'
import { getStakerBalances } from './stake'

const cake: Token = {
  chain: 'bsc',
  address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
  symbol: 'CAKE',
  decimals: 18,
}

const zbc: Token = {
  chain: 'bsc',
  address: '0x37a56cdcd83dce2868f721de58cb3830c44c6303',
  decimals: 9,
  symbol: 'ZBC',
}

const esplarena: Token = {
  chain: 'bsc',
  address: '0xcffd4d3b517b77be32c76da768634de6c738889b',
  decimals: 18,
  symbol: 'ARENA',
}

const primal: Token = {
  chain: 'bsc',
  address: '0xcb5327ed4649548e0d73e70b633cdfd99af6da87',
  decimals: 18,
  symbol: 'PRIMAL',
}

const squad: Token = {
  chain: 'bsc',
  address: '0x724a32dfff9769a0a0e1f0515c0012d1fb14c3bd',
  decimals: 18,
  symbol: 'SQUAD',
}

const xcad: Token = {
  chain: 'bsc',
  address: '0x431e0cd023a32532bf3969cddfc002c00e98429d',
  decimals: 18,
  symbol: 'XCAD',
}

const mgp: Token = {
  chain: 'bsc',
  address: '0xd06716e1ff2e492cc5034c2e81805562dd3b45fa',
  decimals: 18,
  symbol: 'MGP',
}

const stakerCakeToZBC: Contract = {
  chain: 'bsc',
  address: '0xa683C30d47BCd31fB1399b80A4475bc960b903e3',
  underlyings: [cake],
  rewards: [zbc],
}

const stakerCakeToArena: Contract = {
  chain: 'bsc',
  address: '0xDe9FC6485b5f4A1905d8011fcd201EB78CF34073',
  underlyings: [cake],
  rewards: [esplarena],
}

const stakerCakeToPrimal: Contract = {
  chain: 'bsc',
  address: '0x7cE7A5C3241629763899474500D8db1fDFf1dab6',
  underlyings: [cake],
  rewards: [primal],
}

const stakerCakeToSquad: Contract = {
  chain: 'bsc',
  address: '0x08C9d626a2F0CC1ed9BD07eBEdeF8929F45B83d3',
  underlyings: [cake],
  rewards: [squad],
}

const stakerCakeToXcad: Contract = {
  chain: 'bsc',
  address: '0x68Cc90351a79A4c10078FE021bE430b7a12aaA09',
  underlyings: [cake],
  rewards: [xcad],
}

const stakerCakeToMgp: Contract = {
  chain: 'bsc',
  address: '0x365F744c8b7608253697cA2Ed561537B65a3438B',
  underlyings: [cake],
  rewards: [mgp],
}

const masterChef2: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef 2',
  chain: 'bsc',
  address: '0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652', //legacy masterchef
}

const pancakeStableFactory: Contract = {
  name: 'masterChef StableFactory',
  address: '0x36bbb126e75351c0dfb651e39b38fe0bc436ffd2',
  chain: 'bsc',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xca143ce32fe78f1f7019d7d551a6402fc5350c73',
    offset,
    limit,
  })

  return {
    contracts: {
      stakerCakeToZBC,
      stakerCakeToArena,
      stakerCakeToPrimal,
      stakerCakeToSquad,
      stakerCakeToXcad,
      stakerCakeToMgp,
      pairs,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getPancakeswapPairsBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
  factory: Contract,
  rewardToken: Token,
  rewardTokenName?: string,
) {
  return Promise.all([
    getPairsBalances(ctx, pairs),
    getPancakeMasterChefPoolsBalances(ctx, pairs, masterchef, factory, rewardToken, rewardTokenName),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getPancakeswapPairsBalances(...args, masterChef2, pancakeStableFactory, cake),
    stakerCakeToZBC: getStakerBalances,
    stakerCakeToArena: getStakerBalances,
    stakerCakeToPrimal: getStakerBalances,
    stakerCakeToSquad: getStakerBalances,
    stakerCakeToXcad: getStakerBalances,
    stakerCakeToMgp: getStakerBalances,
  })

  return {
    balances,
  }
}
