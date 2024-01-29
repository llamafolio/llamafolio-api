import type { AdapterConfig } from "@lib/adapter";import { getTigrisStakeBalance } from '@adapters/tigris/common/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'arbitrum',
  address: '0x6e8bfbb31a46d0f5502426050ea28b19f8e761f4',
  token: '0x3A33473d7990a605a88ac72A78aD4EFC40a54ADB',
  rewards: ['0x7e491f53bf807f836e2dd6c4a4fbd193e1913efd'],
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getTigrisStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1687132800,
                  }
                  