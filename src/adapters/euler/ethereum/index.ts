import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getBalancesOf } from '@lib/erc20'
import type { Token } from '@lib/token'

import { getHealthFactor, getMarketsContracts } from '../common/markets'
import { getETokenStakes, getEULStakes } from '../common/stake'

const EUL: Token = {
  chain: 'ethereum',
  address: '0xd9Fcd98c322942075A5C3860693e9f4f03AAE07b',
  decimals: 18,
  symbol: 'EUL',
}

const USDC: Token = {
  chain: 'ethereum',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  symbol: 'USDC',
}

const eUSDC: Contract = {
  chain: 'ethereum',
  address: '0xEb91861f8A4e1C12333F42DCE8fB0Ecdc28dA716',
  decimals: 18,
  symbol: 'eUSDC',
  underlyings: [USDC],
}

const eUSDCStaker: Contract = {
  chain: 'ethereum',
  address: '0xE5aFE81e63f0A52a3a03B922b30f73B8ce74D570',
  underlyings: [eUSDC],
}

const USDT: Token = {
  chain: 'ethereum',
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  decimals: 6,
  symbol: 'USDT',
}

const eUSDT: Contract = {
  chain: 'ethereum',
  address: '0x4d19F33948b99800B6113Ff3e83beC9b537C85d2',
  decimals: 18,
  symbol: 'eUSDT',
  underlyings: [USDT],
}

const eUSDTStaker: Contract = {
  chain: 'ethereum',
  address: '0x7882F919e3acCa984babd70529100F937d90F860',
  underlyings: [eUSDT],
}

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

const eWETH: Contract = {
  chain: 'ethereum',
  address: '0x1b808F49ADD4b8C6b5117d9681cF7312Fcf0dC1D',
  decimals: 18,
  symbol: 'eWETH',
  underlyings: [WETH],
}

const eWETHStaker: Contract = {
  chain: 'ethereum',
  address: '0x229443bf7F1297192394B7127427DB172a5bDe9E',
  underlyings: [eWETH],
}

const EULStaker: Contract = {
  chain: 'ethereum',
  address: '0xc697BB6625D9f7AdcF0fbf0cbd4DcF50D8716cd3',
  underlyings: [EUL],
}

const lens: Contract = {
  chain: 'ethereum',
  name: 'Euler Simple Lens',
  address: '0x5077B7642abF198b4a5b7C4BdCE4f03016C7089C',
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx)
  const stakers = [eUSDCStaker, eUSDTStaker, eWETHStaker]

  return {
    contracts: { stakers, EULStaker, markets, lens },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      markets: getBalancesOf,
      stakers: getETokenStakes,
      EULStaker: (...args) => getEULStakes(...args, [USDC, USDT, WETH]),
    }),
    getHealthFactor(ctx, lens),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}
