import type { AdapterConfig } from "@lib/adapter";import { getControllersBalances } from '@adapters/crvusd/ethereum/balance'
import { getControllers } from '@adapters/crvusd/ethereum/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'

const crvUSD: Contract = {
  chain: 'ethereum',
  address: '0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E',
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
    contracts: { controllers, crvUSD },
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
                  