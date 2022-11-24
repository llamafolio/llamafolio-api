import { Balance, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Chain } from '@lib/chains'

export async function getStakeBalances(ctx: BaseContext, chain: Chain, staking: Contract): Promise<Balance[]> {
  console.log(ctx, chain, staking)

  return []
}

// Example contract object
const staking: Contract = {
  name: '',
  displayName: '',
  chain: 'ethereum',
  address: '',
}

export const getContracts = async () => {
  return {
    // All contracts `getBalances` will look at, grouped by keys
    contracts: { staking },
    // Optional revalidate time (in seconds).
    // Contracts returned by the adapter are cached by default and can be updated by interval with this parameter.
    // This is mostly used for Factory contracts, where the number of contracts deployed increases over time
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  // Any method to check all the contracts retrieved above.
  // This function will be run each time a user queries his balances.
  // As static contracts info are filled in getContracts, this should ideally only fetch the current amount of each contract (+ underlyings and rewards)
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    staking: getStakeBalances,
  })

  return {
    balances,
  }
}
