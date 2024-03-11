import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  return {
    // Contracts grouped by keys. They will be passed to getBalances, filtered by user interaction
    contracts: {},
    // Optional revalidate time (in seconds).
    // Contracts returned by the adapter are cached by default and can be updated by interval with this parameter.
    // This is mostly used for Factory contracts, where the number of contracts deployed increases over time
    // revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  // Any method to check the contracts retrieved above (based on user interaction).
  // This function will be run each time a user queries his balances.
  // As static contracts info is filled in getContracts, this should ideally only fetch the current amount of each contract (+ underlyings and rewards)
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {})

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1709683200,
}
