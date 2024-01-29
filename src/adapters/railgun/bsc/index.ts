import type { AdapterConfig } from "@lib/adapter";import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getRailgunBalances } from '../common/balance'

const railgunStaker: Contract = {
  chain: 'bsc',
  address: '0x753f0F9BA003DDA95eb9284533Cf5B0F19e441dc',
  token: '0x3F847b01d4d498a293e3197B186356039eCd737F',
}

export const getContracts = () => {
  return {
    contracts: { railgunStaker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    railgunStaker: getRailgunBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1643846400,
                  }
                  