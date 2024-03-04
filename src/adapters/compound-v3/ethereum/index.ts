import { getCollContracts } from '@adapters/compound-v3/common/asset'
import { getCompoundBalances } from '@adapters/compound-v3/common/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const USDC: Token = {
  chain: 'ethereum',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
}

const WETH: Token = {
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbol: 'WETH',
}

const cUSDCv3: Contract = {
  chain: 'ethereum',
  address: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
}

const cWETHv3: Contract = {
  chain: 'ethereum',
  address: '0xa17581a9e3356d9a858b789d68b4d866e593ae94',
}

const rewarder: Contract = {
  chain: 'ethereum',
  address: '0x1B0e765F6224C21223AeA2af16c1C46E38885a40',
}

export const getContracts = async (ctx: BaseContext) => {
  const [usdcCompounder, ethCompounder] = await Promise.all([
    getCollContracts(ctx, cUSDCv3),
    getCollContracts(ctx, cWETHv3),
  ])

  return {
    contracts: { usdcCompounder, ethCompounder },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    usdcCompounder: (...args) => getCompoundBalances(...args, USDC, rewarder),
    ethCompounder: (...args) => getCompoundBalances(...args, WETH, rewarder),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1661558400,
}
