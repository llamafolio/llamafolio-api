import { getAcrossLPBalances } from '@adapters/across/ethereum/v1/balance'
import { getAcrossContracts } from '@adapters/across/ethereum/v1/contract'
import { getAcrossV2FarmBalances, getAcrossV2LPBalances } from '@adapters/across/ethereum/v2/balance'
import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const pools: Contract[] = [
  {
    chain: 'ethereum',
    address: '0x7355efc63ae731f584380a9838292c7046c1e433',
    decimals: 18,
    symbol: 'A-WETH-LP',
  },
  {
    chain: 'ethereum',
    address: '0xdfe0ec39291e3b60aca122908f86809c9ee64e90',
    decimals: 18,
    symbol: 'A-UMA-LP',
  },
  {
    chain: 'ethereum',
    address: '0x43f133fe6fdfa17c417695c476447dc2a449ba5b',
    decimals: 18,
    symbol: 'A-DAI-LP',
  },
  {
    chain: 'ethereum',
    address: '0x43298f9f91a4545df64748e78a2c777c580573d6',
    decimals: 18,
    symbol: 'A-BADGER-LP',
  },
  {
    chain: 'ethereum',
    address: '0x02fbb64517e1c6ed69a6faa3abf37db0482f1152',
    decimals: 18,
    symbol: 'A-WBTC-LP',
  },
  {
    chain: 'ethereum',
    address: '0x256c8919ce1ab0e33974cf6aa9c71561ef3017b6',
    decimals: 18,
    symbol: 'A-USDC-LP',
  },
]

const manager: Contract = {
  chain: 'ethereum',
  address: '0xc186fA914353c44b2E33eBE05f21846F1048bEda',
}

const farmer: Contract = {
  chain: 'ethereum',
  address: '0x9040e41ef5e8b281535a96d9a48acb8cfabd9a48',
}

const pools_v2: Contract[] = [
  {
    chain: 'ethereum',
    address: '0xc9b09405959f63f72725828b5d449488b02be1ca',
    decimals: 6,
    symbol: 'Av2-USDC-LP',
    underlyings: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
  },
  {
    chain: 'ethereum',
    address: '0x28f77208728b0a45cab24c4868334581fe86f95b',
    decimals: 18,
    symbol: 'Av2-WETH-LP',
    underlyings: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
  },
  {
    chain: 'ethereum',
    address: '0xb0c8fef534223b891d4a430e49537143829c4817',
    decimals: 18,
    symbol: 'Av2-ACX-LP',
    underlyings: ['0x44108f0223a3c3028f5fe7aec7f9bb2e66bef82f'],
  },
  {
    chain: 'ethereum',
    address: '0x59c1427c658e97a7d568541dac780b2e5c8affb4',
    decimals: 8,
    symbol: 'Av2-WBTC-LP',
    underlyings: ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
  },
  {
    chain: 'ethereum',
    address: '0x4fabacac8c41466117d6a38f46d08ddd4948a0cb',
    decimals: 18,
    symbol: 'Av2-DAI-LP',
    underlyings: ['0x6b175474e89094c44da98b954eedeac495271d0f'],
  },
  {
    chain: 'ethereum',
    address: '0xc2fab88f215f62244d2e32c8a65e8f58da8415a5',
    decimals: 6,
    symbol: 'Av2-USDT-LP',
    underlyings: ['0xdac17f958d2ee523a2206206994597c13d831ec7'],
  },
  {
    chain: 'ethereum',
    address: '0xfacd2ec4647df2cb758f684c2aaab56a93288f9e',
    decimals: 18,
    symbol: 'Av2-BAL-LP',
    underlyings: ['0xba100000625a3754423978a60c9317c58a424e3d'],
  },
  {
    chain: 'ethereum',
    address: '0xb9921d28466304103a233fcd071833e498f12853',
    decimals: 18,
    symbol: 'Av2-UMA-LP',
    underlyings: ['0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828'],
  },
  {
    chain: 'ethereum',
    address: '0x9306b6f45263f8cb6a18eff127313d10d06fccb5',
    decimals: 18,
    symbol: 'Av2-BOBA-LP',
    underlyings: ['0x42bbfa2e77757c645eeaad1655e0911a7553efbc'],
  },
  {
    chain: 'ethereum',
    address: '0xe480f5a42e263ac0352d0c9c6e75c4a612ee52a7',
    decimals: 18,
    symbol: 'Av2-SNX-LP',
    underlyings: ['0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f'],
  },
  {
    chain: 'ethereum',
    address: '0xb5124b9ae9efea2add1ff768eec75095e8d9d532',
    decimals: 18,
    symbol: 'Av2-BADGER-LP',
    underlyings: ['0x3472A5A71965499acd81997a54BBA8D852C6E53d'],
  },
]

export const getContracts = async (ctx: BaseContext) => {
  const LPs = await getAcrossContracts(ctx, pools)

  return {
    contracts: { LPs, pools_v2, manager, farmer },
  }
}

const getAcrossV2Balances = async (ctx: BalancesContext, pools: Contract[]) => {
  return Promise.all([getAcrossV2LPBalances(ctx, pools, manager), getAcrossV2FarmBalances(ctx, pools, farmer)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    LPs: getAcrossLPBalances,
    pools_v2: getAcrossV2Balances,
  })

  return {
    groups: [{ balances }],
  }
}
