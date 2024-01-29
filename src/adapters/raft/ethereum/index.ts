import { getRaftBalances } from '@adapters/raft/ethereum/balance'
import { getRaftContracts } from '@adapters/raft/ethereum/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

// v1
const positionManagerV1: Contract = {
  chain: 'ethereum',
  address: '0x5F59b322eB3e16A0C78846195af1F588b77403FC',
}

const wstETH: Token = {
  chain: 'ethereum',
  address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  decimals: 18,
  symbol: 'wstETH',
}

// v2
const positionManagerV2: Contract = {
  chain: 'ethereum',
  address: '0x9ab6b21cdf116f611110b048987e58894786c244',
}

const assets: Token[] = [
  { chain: 'ethereum', address: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704', decimals: 18, symbol: 'cbETH' },
  { chain: 'ethereum', address: '0xae78736cd615f374d3085123a210448e74fc6393', decimals: 18, symbol: 'rETH' },
  { chain: 'ethereum', address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', decimals: 18, symbol: 'wstETH' },
  { chain: 'ethereum', address: '0xf951E335afb289353dc249e82926178EaC7DEd78', decimals: 18, symbol: 'swETH' },
]

const farmer: Contract = {
  chain: 'ethereum',
  address: '0x2ba26bae6df1153e29813d7f926143f9c94402f3',
  decimals: 18,
  symbol: 'RR',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pool, pools] = await Promise.all([
    getRaftContracts(ctx, positionManagerV1, [wstETH]),
    getRaftContracts(ctx, positionManagerV2, assets),
  ])

  return {
    contracts: { pools: [...pool, ...pools], farmer },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balancesGroups, balances] = await Promise.all([
    getRaftBalances(ctx, contracts.pools || []),
    resolveBalances<typeof getContracts>(ctx, contracts, {
      // farmer: getRaftFarmBalance, disable since hack on nov. 2023
    }),
  ])

  return {
    groups: [...balancesGroups, { balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1697241600,
}
