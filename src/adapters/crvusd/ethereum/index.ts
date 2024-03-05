import { getControllersBalances } from '@adapters/crvusd/ethereum/balance'
import { getControllers } from '@adapters/crvusd/ethereum/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'

const crvController: Contract = {
  chain: 'ethereum',
  name: 'crvUSD Controller',
  address: '0x7443944962d04720f8c220c0d25f56f869d6efd4',
  token: '0xd533a949740bb3306d119cc777fa900ba034cd52',
}

const factory: Contract = {
  name: 'crvUSD ControllerFactory',
  chain: 'ethereum',
  address: '0xC9332fdCB1C491Dcc683bAe86Fe3cb70360738BC',
}

export const getContracts = async (ctx: BaseContext) => {
  const crvUSDController = await getControllers(ctx, factory)

  return {
    contracts: { controllers: [...crvUSDController, crvController] },
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
