import { getSwaapBalances, getSwaapPools } from '@adapters/swaap/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = [
  '0x6bB19Ff73cd6b35757f973ecf9541f2Ef20e2555',
  '0x0e58b97A209526D6c85ffF215F48284bE9611c8A',
  '0x3fbF7753fF5B217CA8FfBB441939c20bF3EC3be1',
]

const vault: Contract = {
  chain: 'polygon',
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
