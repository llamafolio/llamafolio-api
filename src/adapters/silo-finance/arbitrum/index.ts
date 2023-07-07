import { getSiloBalances } from '@adapters/silo-finance/common/balance'
import { getSiloPools } from '@adapters/silo-finance/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const siloVaults: `0x${string}`[] = [
  '0x0696e6808ee11a5750733a3d821f9bb847e584fb',
  '0x7e38a9d2c99caef533e5d692ed8a2ce4b478e585',
  '0xae1eb69e880670ca47c50c9ce712ec2b48fac3b6',
  '0x862da0a25e3dfe46df2cd4c14d79e1e4684dea4a',
  '0x30c4aa967f68705ab5677ebe17b3affd0c59e71c',
  '0x950aaeda8c6e806a8c889b4dbcc0361760b86249',
  '0xde998e5eef06dd09ff467086610b175f179a66a0',
  '0xa8897b4552c075e884bdb8e7b704eb10db29bf0d',
  '0xfc6778a6955e1cecac448051de967f9b5ff4d647',
  '0x5eda4bee7ba556e65bc4fb9eed5d74e61bc1f2a9',
  '0x82622a6bdd2f1fa757a08837633971d42c17241a',
  '0xc0ab69fffeb5375235d8caa4f7218097bbcc0a0a',
  '0xa0cf37273068b461df43f1cfb58e2b2cecb56706',
  '0x69ec552be56e6505703f0c861c40039e5702037a',
  '0x033f86120c101b0480b5c70327a8e90c4ae35041',
  '0x170a90981843461295a6ce0e0a631ee440222e29',
  '0xe60bb5f4795c829f0a917b2f847e21a748d0e36c',
  '0xf60b7c2d1fb0ba86fe20baf86d04df738acfe577',
  '0xd713ef310351055af26c6d3e20c4e629090c39a5',
]

const routers: Contract[] = [{ chain: 'arbitrum', address: '0x9992f660137979C1ca7f8b119Cd16361594E3681' }]

const incentive: Contract = {
  chain: 'arbitrum',
  address: '0x4999873bf8741bfffb0ec242aaaa7ef1fe74fce8',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSiloPools(ctx, siloVaults)
  const fmtInteractions = routers.map((router) => ({ ...router, pools }))

  return {
    contracts: { pools, fmtInteractions },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    fmtInteractions: (...args) => getSiloBalances(...args, incentive),
  })

  return {
    groups: [{ balances }],
  }
}
