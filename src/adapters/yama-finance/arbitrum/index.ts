import { getYamaStakeBalances } from '@adapters/yama-finance/arbitrum/balance'
import { getCDPBalances, getCDPCollateralAssets } from '@adapters/yama-finance/arbitrum/CDP'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'

const USDT: Token = {
  chain: 'arbitrum',
  address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  decimals: 6,
  symbol: 'USDT',
}

const USDT_YL: Contract = {
  chain: 'arbitrum',
  address: '0x3296ee4fa62d0d78b1999617886e969a22653383',
  underlyings: [USDT],
}

const YAMA: Contract = {
  chain: 'arbitrum',
  address: '0x7a88b57bf741a3950e53421eaa6c1a3c89d066f9',
  symbol: 'YAMA',
  decimals: 18,
  underlyings: [USDT],
}

const CDP: Contract = {
  chain: 'arbitrum',
  address: '0x1cd97ee98f3423222f7b4cddb383f2ee2907e628',
}

export const getContracts = async (ctx: BaseContext) => {
  const collateralAssets = await getCDPCollateralAssets(ctx, CDP)

  return {
    contracts: { USDT_YL, YAMA, CDP, collateralAssets },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getCDPBalances(ctx, CDP, contracts.collateralAssets || []),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      USDT_YL: getYamaStakeBalances,
      YAMA: getSingleStakeBalance,
    }),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}
