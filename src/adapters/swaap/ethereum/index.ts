import { getSwaapBalances, getSwaapPools } from '@adapters/swaap/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = [
  '0x5EE945D9Bfa5AD48c64fC7ACfed497d3546c0d03',
  '0xA441CF75BCFb5833cB1ba7c93A0721ae9B292789',
]

const vault: Contract = {
  chain: 'ethereum',
  address: '0xd315a9c38ec871068fec378e4ce78af528c76293',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSwaapPools(ctx, poolAddresses, vault)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getSwaapBalances(...args, vault),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1688256000,
}
