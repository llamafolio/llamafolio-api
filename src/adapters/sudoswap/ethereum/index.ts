import { fetchPairsBalances } from '@adapters/sudoswap/ethereum/balance'
import { fetchPairs } from '@adapters/sudoswap/ethereum/contract'
import { getSudoFarmBalances } from '@adapters/sudoswap/ethereum/farm'
import { getSudoLockerBalance } from '@adapters/sudoswap/ethereum/locker'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const graphQl = 'https://api.thegraph.com/subgraphs/name/zeframlou/sudoswap'

const oldLocker: Contract = {
  chain: 'ethereum',
  address: '0xada31f59e70ad18665380f21ce49d4c43f9865c2',
  token: '0x3aaDA3e213aBf8529606924d8D1c55CbDc70Bf74',
}

const farmer: Contract = {
  chain: 'ethereum',
  address: '0xfb5bb77c20be279f83ded74438a574e666e118b4',
  token: '0x1533F61FAcb7cc3A632B12ea9f55D3FBb57309E0',
  underlyings: ['0x3446Dd70B2D52A6Bf4a5a192D9b0A161295aB7F9', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
}

export const getContracts = async (ctx: BaseContext) => {
  const nfts = await fetchPairs(ctx, graphQl)

  return {
    contracts: { nfts, oldLocker, farmer },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    nfts: (...args) => fetchPairsBalances(...args, graphQl),
    oldLocker: getSudoLockerBalance,
    farmer: getSudoFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
