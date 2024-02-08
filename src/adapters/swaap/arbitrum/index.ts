import { getSwaapBalances, getSwaapPools } from '@adapters/swaap/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = [
  '0xc54ba936C9E40e5c5D31c241E8e3cBA90e0084E6',
  '0x0c0ADd0f4D8858516075ebAF8Cb1B98d1b33741a',
]

const vault: Contract = {
  chain: 'arbitrum',
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
