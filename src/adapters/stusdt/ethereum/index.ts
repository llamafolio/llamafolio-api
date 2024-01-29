import type { AdapterConfig } from "@lib/adapter";import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const stUSDT: Contract = {
  chain: 'ethereum',
  address: '0x25ec98773d7b4ced4cafab96a2a1c0945f145e10',
  underlyings: ['0xdac17f958d2ee523a2206206994597c13d831ec7'],
}

export const getContracts = () => {
  return {
    contracts: { stUSDT },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stUSDT: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1691107200,
                  }
                  