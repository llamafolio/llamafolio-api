import { getAssetsContracts } from '@adapters/compound-v3/common/asset'
import { getCompLendBalances } from '@adapters/compound-v3/common/balance'
import type { AdapterConfig, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalances } from '@lib/stake'
import type { Token } from '@lib/token'

// USDC Native version
const USDC: Token = {
  chain: 'arbitrum',
  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  decimals: 6,
  symbol: 'USDC',
}

// USDC.e Bridged version
const USDC_e: Token = {
  chain: 'arbitrum',
  address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  decimals: 6,
  symbol: 'USDC.e',
}

// cUSDCv3 through USDC Native version
const cUSDCv3_n: Contract = {
  chain: 'arbitrum',
  address: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf',
  token: USDC.address,
  underlyings: [USDC],
}

// cUSDCv3 through USDC.e Bridged version
const cUSDCv3_b: Contract = {
  chain: 'arbitrum',
  address: '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA',
  token: USDC_e.address,
  underlyings: [USDC_e],
}

const rewarder: Contract = {
  chain: 'arbitrum',
  address: '0x88730d254A2f7e6AC8388c3198aFd694bA9f7fae',
}

export const getContracts = async (ctx: BaseContext) => {
  const compounders = await getAssetsContracts(ctx, [cUSDCv3_n, cUSDCv3_b])

  return {
    contracts: { compounders },
    revalidate: 60 * 60,
  }
}

const compoundBalances = async (ctx: BalancesContext, compounders: Contract[], rewarder: Contract) => {
  return Promise.all([getSingleStakeBalances(ctx, compounders), getCompLendBalances(ctx, compounders, rewarder)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    compounders: (...args) => compoundBalances(...args, rewarder),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1684281600,
}
