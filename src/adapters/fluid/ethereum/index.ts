import { getFluidBalances, getFluidFarmBalances } from '@adapters/fluid/ethereum/balance'
import { getFluidContracts, getFluidFarmingContracts } from '@adapters/fluid/ethereum/pool'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolsAddresses: `0x${string}`[] = [
  '0x9fb7b4477576fe5b32be4c1843afb1e55f251b33', // fUSDC
  '0x5c20b550819128074fd538edf79791733ccedd18', // fUSDT
  '0x90551c1795392094fe6d29b758eccd233cfaa260', // fWETH
]

const farmerAddresses: `0x${string}`[] = [
  '0x2fa6c95b69c10f9f52b8990b6c03171f13c46225',
  '0x490681095ed277b45377d28ca15ac41d64583048',
]

export const getContracts = async (ctx: BaseContext) => {
  const [pools, farmers] = await Promise.all([
    getFluidContracts(ctx, poolsAddresses),
    getFluidFarmingContracts(ctx, farmerAddresses),
  ])

  return {
    contracts: { pools, farmers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getFluidBalances,
    farmers: getFluidFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1708819200,
}
