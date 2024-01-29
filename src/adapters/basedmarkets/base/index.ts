import type { AdapterConfig } from "@lib/adapter";import { getBasedMarketsStakeBalance } from '@adapters/basedmarkets/base/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const sBASED: Contract = {
  chain: 'base',
  address: '0xf39acf265ed73d8eb9359ce068a20036caf3cec8',
  token: '0xBa5E6fa2f33f3955f0cef50c63dCC84861eAb663',
}

export const getContracts = () => {
  return {
    contracts: { sBASED },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    sBASED: getBasedMarketsStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1696896000,
                  }
                  