import { getSiloBalances } from '@adapters/silo-finance/common/balance'
import { getSiloPools } from '@adapters/silo-finance/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'

const siloVaults: `0x${string}`[] = [
  '0xa8897b4552c075e884bdb8e7b704eb10db29bf0d',
  '0x69ec552be56e6505703f0c861c40039e5702037a',
  '0x0696e6808ee11a5750733a3d821f9bb847e584fb',
  '0x170a90981843461295a6ce0e0a631ee440222e29',
  '0xea9961280b48fe521ece83f6cd8a7e9b2c4ffc2e',
  '0xde998e5eef06dd09ff467086610b175f179a66a0',
  '0x7e38a9d2c99caef533e5d692ed8a2ce4b478e585',
  '0xae1eb69e880670ca47c50c9ce712ec2b48fac3b6',
  '0x19d3f8d09773065867e9fd11716229e73481c55a',
  '0xb9d098e61ec165d3c530dd67ce77b18be426ea91',
  '0x82622a6bdd2f1fa757a08837633971d42c17241a',
  '0x5eda4bee7ba556e65bc4fb9eed5d74e61bc1f2a9',
  '0xfc6778a6955e1cecac448051de967f9b5ff4d647',
  '0xa4487d52a5ac147f249d44d5af8b3c71eba77478',
  '0xa0cf37273068b461df43f1cfb58e2b2cecb56706',
  '0x8922225135acbac6f49aaccc638a8fb79119795c',
  '0xc0ab69fffeb5375235d8caa4f7218097bbcc0a0a',
  '0x033f86120c101b0480b5c70327a8e90c4ae35041',
  '0x862da0a25e3dfe46df2cd4c14d79e1e4684dea4a',
  '0x950aaeda8c6e806a8c889b4dbcc0361760b86249',
  '0xd713ef310351055af26c6d3e20c4e629090c39a5',
  '0xe60bb5f4795c829f0a917b2f847e21a748d0e36c',
  '0xf60b7c2d1fb0ba86fe20baf86d04df738acfe577',
  '0x6036beb05ff71215d1257fc1db1586c87746464f',
  '0xe5741b993dbee7b433c1cfd0c885bab901dd406d',
  '0x5c2b80214c1961db06f69dd4128bcffc6423d44f',
  '0x30c4aa967f68705ab5677ebe17b3affd0c59e71c',
]

const rawRouters: Contract[] = [{ chain: 'arbitrum', address: '0x9992f660137979C1ca7f8b119Cd16361594E3681' }]

const legacylens: Contract = {
  chain: 'arbitrum',
  address: '0x07b94eB6AaD663c4eaf083fBb52928ff9A15BE47',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSiloPools(ctx, siloVaults)
  const routers: Contract[] = rawRouters.map((router) => ({ ...router, underlyings: pools }))

  return {
    contracts: {
      routers,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await getSiloBalances(ctx, contracts.routers || [], legacylens)

  return {
    groups: [...balances],
  }
}

export const config: AdapterConfig = {
  startDate: 1668211200,
}
