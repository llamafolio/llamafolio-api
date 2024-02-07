import { getControllersBalances } from '@adapters/crvusd/ethereum/balance'
import { getControllers } from '@adapters/crvusd/ethereum/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'

const crvUSD: Contract = {
  chain: 'ethereum',
  address: '0xf939e0a03fb07f59a73314e73794be0e57ac1b4e',
  symbol: 'crvUSD',
  decimals: 18,
  stable: true,
}

const factory: Contract = {
  name: 'crvUSD ControllerFactory',
  chain: 'ethereum',
  address: '0xC9332fdCB1C491Dcc683bAe86Fe3cb70360738BC',
}

export const getContracts = async (ctx: BaseContext) => {
  const controllers = await getControllers(ctx, factory)

  return {
    contracts: { controllers },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const groups = await getControllersBalances(ctx, contracts.controllers || [])

  return {
    groups,
  }
}

export const config: AdapterConfig = {
  startDate: 1684368000,
}
