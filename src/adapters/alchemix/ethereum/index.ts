import type { getStakerContractsParams } from '@adapters/alchemix/common/stake'
import { getStakerBalances, getStakerContracts } from '@adapters/alchemix/common/stake'
import type { getTransmutationContractsParams } from '@adapters/alchemix/common/transmuter'
import { getTransmutationBalances } from '@adapters/alchemix/common/transmuter'
import { getTransmutationBalances as getTransmutationBalancesV2 } from '@adapters/alchemix/common/transmuter-v2'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const DAI: Token = {
  chain: 'ethereum',
  address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  decimals: 18,
  symbol: 'DAI',
}

const USDC: Token = {
  chain: 'ethereum',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
}

const USDT: Token = {
  chain: 'ethereum',
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  decimals: 6,
  symbol: 'USDT',
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

const daiTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xA840C73a004026710471F727252a9a2800a5197F',
  underlyings: [DAI],
}

const usdcTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x49930AD9eBbbc0EB120CCF1a318c3aE5Bb24Df55',
  underlyings: [USDC],
}

const usdtTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xfC30820ba6d045b95D13a5B8dF4fB0E6B5bdF5b9',
  underlyings: [USDT],
}

const ydaiTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xdA816459F1AB5631232FE5e97a05BBBb94970c95',
  underlyings: [DAI],
}

const yusdcTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xa354F35829Ae975e850e23e9615b11Da1B3dC4DE',
  underlyings: [USDC],
}

const yusdtTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x7Da96a3891Add058AdA2E826306D812C638D87a7',
  underlyings: [USDT],
}

const wethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x03323143a5f0D0679026C2a9fB6b0391e4D64811',
  underlyings: [WETH],
}

const ywethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xa258C4606Ca8206D8aA700cE2143D7db854D168c',
  underlyings: [WETH],
}

const wstethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  underlyings: [WETH],
}

const rethTransmuter: Contract = {
  chain: 'ethereum',
  address: '0xae78736Cd615f374D3085123A210448E74Fc6393',
  underlyings: [WETH],
}

const alUSDtransmuter: Contract = {
  chain: 'ethereum',
  address: '0x5C6374a2ac4EBC38DeA0Fc1F8716e5Ea1AdD94dd',
  underlyings: [alUSD],
}

const alETHtransmuter: Contract = {
  chain: 'ethereum',
  address: '0x062Bf725dC4cDF947aa79Ca2aaCCD4F385b13b5c',
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
    contracts: { alchemixStaker, stakers, transmuters, reactivesV2, transmutersV2 },
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
