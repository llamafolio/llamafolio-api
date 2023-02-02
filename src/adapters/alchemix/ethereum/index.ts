import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getStakerBalances, getStakerContracts, getStakerContractsParams } from '../common/stake'
import { getTransmutationBalances, getTransmutationContractsParams } from '../common/transmuter'

const DAI: Token = {
  chain: 'ethereum',
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  decimals: 18,
  symbol: 'DAI',
}

const WETH: Token = {
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbol: 'WETH',
}

const alUSD: Token = {
  chain: 'ethereum',
  address: '0xBC6DA0FE9aD5f3b0d58160288917AA56653660E9',
  decimals: 18,
  symbol: 'alUSD',
}

const alETH: Token = {
  chain: 'ethereum',
  address: '0x0100546F2cD4C9D97f798fFC9755E47865FF7Ee6',
  decimals: 18,
  symbol: 'alETH',
}

const alchemixStaker: Contract = {
  chain: 'ethereum',
  address: '0xAB8e74017a8Cc7c15FFcCd726603790d26d7DeCa',
}

const alEthTransmuter: getTransmutationContractsParams = {
  chain: 'ethereum',
  address: '0xf8317BD5F48B6fE608a52B48C856D3367540B73B',
  lender: WETH,
  borrower: alETH,
}

const alUsdTransmuter: getTransmutationContractsParams = {
  chain: 'ethereum',
  address: '0xc21D353FF4ee73C572425697f4F5aaD2109fe35b',
  lender: DAI,
  borrower: alUSD,
}

export const getContracts = async (ctx: BaseContext) => {
  const transmuters: getTransmutationContractsParams[] = [alEthTransmuter, alUsdTransmuter]
  const stakers: getStakerContractsParams[] = await getStakerContracts(ctx, alchemixStaker)

  return {
    contracts: { alchemixStaker, stakers, transmuters },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    transmuters: getTransmutationBalances,
    stakers: (...args) => getStakerBalances(...args, alchemixStaker),
  })

  return {
    balances,
  }
}
