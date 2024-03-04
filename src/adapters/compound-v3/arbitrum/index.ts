import { getCollContracts } from '@adapters/compound-v3/common/asset'
import { getCompoundBalances } from '@adapters/compound-v3/common/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
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
}

// cUSDCv3 through USDC.e Bridged version
const cUSDCv3_b: Contract = {
  chain: 'arbitrum',
  address: '0xA5EDBDD9646f8dFF606d7448e414884C7d905dCA',
}

const rewarder: Contract = {
  chain: 'arbitrum',
  address: '0x88730d254A2f7e6AC8388c3198aFd694bA9f7fae',
}

export const getContracts = async (ctx: BaseContext) => {
  const [usdcCompounder, usdc_eCompounder] = await Promise.all([
    getCollContracts(ctx, cUSDCv3_n),
    getCollContracts(ctx, cUSDCv3_b),
  ])

  return {
    contracts: { usdcCompounder, usdc_eCompounder },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    usdcCompounder: (...args) => getCompoundBalances(...args, USDC, rewarder),
    usdc_eCompounder: (...args) => getCompoundBalances(...args, USDC_e, rewarder),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1684281600,
}
