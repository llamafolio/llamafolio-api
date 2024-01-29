import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'
import { getPairsContracts } from '@lib/uniswap/v2/factory'

import { getWigoBalances, getWigoswapPairsBalances } from './balance'

const wigo: Token = {
  chain: 'fantom',
  address: '0xe992beab6659bff447893641a378fbbf031c5bd6',
  decimals: 18,
  symbol: 'WIGO',
}

const pool: Contract = {
  chain: 'fantom',
  address: '0x4178e335bd36295ffbc250490edbb6801081d022',
  token: '0xe992beab6659bff447893641a378fbbf031c5bd6',
}

const masterChef: Contract = {
  chain: 'fantom',
  address: '0xA1a938855735C0651A6CfE2E93a32A28A236d0E9',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xC831A5cBfb4aC2Da5ed5B194385DFD9bF5bFcBa7',
    offset,
    limit,
  })

  return {
    contracts: {
      masterChef,
      pool,
      pairs,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getWigoswapPairsBalances(...args, masterChef, wigo, 'Wigo'),
    pool: getWigoBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1643846400,
}
