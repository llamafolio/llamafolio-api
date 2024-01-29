import type { AdapterConfig } from "@lib/adapter";import { getEverriseBalances } from '@adapters/everrise/common/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const nftStaker: Contract = {
  chain: 'fantom',
  address: '0x23cd2e6b283754fd2340a75732f9ddbb5d11807e',
  token: '0xc17c30e98541188614df99239cabd40280810ca3',
  underlyings: ['0xc17c30e98541188614df99239cabd40280810ca3'],
  rewards: ['0xc17c30e98541188614df99239cabd40280810ca3'],
}

export const getContracts = () => {
  return {
    contracts: { nftStaker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    nftStaker: getEverriseBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1643155200,
                  }
                  