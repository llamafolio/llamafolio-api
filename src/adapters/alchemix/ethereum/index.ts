import type { getStakerContractsParams } from '@adapters/alchemix/common/stake'
import { getStakerBalances, getStakerContracts } from '@adapters/alchemix/common/stake'
import type { getTransmutationContractsParams } from '@adapters/alchemix/common/transmuter'
import { getTransmutationBalances } from '@adapters/alchemix/common/transmuter'
import { getTransmutationBalances as getTransmutationBalancesV2 } from '@adapters/alchemix/common/transmuter-v2'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const DAI: Token = {
  chain: 'ethereum',
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  decimals: 18,
  symbol: 'DAI',
}

const USDC: Token = {
  chain: 'ethereum',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  symbol: 'USDC',
}

const USDT: Token = {
  chain: 'ethereum',
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  decimals: 6,
  symbol: 'USDT',
}

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

const alUSD: Token = {
  chain: 'ethereum',
  address: '0xbc6da0fe9ad5f3b0d58160288917aa56653660e9',
  decimals: 18,
  symbol: 'alUSD',
}

const alETH: Token = {
  chain: 'ethereum',
  address: '0x0100546f2cd4c9d97f798ffc9755e47865ff7ee6',
  decimals: 18,
  symbol: 'alETH',
}

const alchemixStaker: Contract = {
  chain: 'ethereum',
  address: '0xab8e74017a8cc7c15ffccd726603790d26d7deca',
}

const alEthTransmuter: getTransmutationContractsParams = {
  chain: 'ethereum',
  address: '0xf8317bd5f48b6fe608a52b48c856d3367540b73b',
  lender: WETH,
  borrower: alETH,
}

const alUsdTransmuter: getTransmutationContractsParams = {
  chain: 'ethereum',
  address: '0xc21d353ff4ee73c572425697f4f5aad2109fe35b',
  lender: DAI,
  borrower: alUSD,
}

const daiTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xa840c73a004026710471f727252a9a2800a5197f',
  underlyings: [DAI],
}

const usdcTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x49930ad9ebbbc0eb120ccf1a318c3ae5bb24df55',
  underlyings: [USDC],
}

const usdtTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xfc30820ba6d045b95d13a5b8df4fb0e6b5bdf5b9',
  underlyings: [USDT],
}

const ydaiTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xda816459f1ab5631232fe5e97a05bbbb94970c95',
  underlyings: [DAI],
}

const yusdcTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xa354f35829ae975e850e23e9615b11da1b3dc4de',
  underlyings: [USDC],
}

const yusdtTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x7da96a3891add058ada2e826306d812c638d87a7',
  underlyings: [USDT],
}

const wethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x03323143a5f0d0679026c2a9fb6b0391e4d64811',
  underlyings: [WETH],
}

const ywethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xa258c4606ca8206d8aa700ce2143d7db854d168c',
  underlyings: [WETH],
}

const wstethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
  underlyings: [WETH],
}

const rethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xae78736cd615f374d3085123a210448e74fc6393',
  underlyings: [WETH],
}

const alUSDtransmuter: Contract = {
  chain: 'ethereum',
  address: '0x5c6374a2ac4ebc38dea0fc1f8716e5ea1add94dd',
  underlyings: [alUSD],
}

const alETHtransmuter: Contract = {
  chain: 'ethereum',
  address: '0x062bf725dc4cdf947aa79ca2aaccd4f385b13b5c',
  underlyings: [alETH],
}

const reactivesV2 = [
  daiTransmuter,
  usdcTransmuter,
  usdtTransmuter,
  ydaiTransmuter,
  yusdcTransmuter,
  yusdtTransmuter,
  wethTransmuter,
  ywethTransmuter,
  wstethTransmuter,
  rethTransmuter,
]

const transmutersV2 = [alUSDtransmuter, alETHtransmuter]

export const getContracts = async (ctx: BaseContext) => {
  const transmuters: getTransmutationContractsParams[] = [alEthTransmuter, alUsdTransmuter]
  const stakers: getStakerContractsParams[] = await getStakerContracts(ctx, alchemixStaker)

  return {
    contracts: { alchemixStaker, stakers, transmuters, transmutersV2 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    transmuters: getTransmutationBalances,
    transmutersV2: (...args) => getTransmutationBalancesV2(...args, reactivesV2),
    stakers: (...args) => getStakerBalances(...args, alchemixStaker),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1637193600,
}
