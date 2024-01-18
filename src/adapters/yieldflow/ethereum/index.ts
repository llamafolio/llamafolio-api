import { getYieldFlowBalances } from '@adapters/yieldflow/ethereum/balance'
import { getYieldFlowPools } from '@adapters/yieldflow/ethereum/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = [
  '0x28e90157c8d200aa8a19e8dc7e2e490a15c6405a',
  '0xe7a9957a014aee849ef3b99bb66eb30952991e73',
  '0xf4e7b939598f083cd03059fda9ea0a19b9e8e2d8',
  '0xf1bd4a4fef81f32c0e02a3840591546b2cd502d4',
  '0xf6a23e026b3e2bbb5f664335df2b32e0ac0c6257',
  '0x2da988076b26869f8641f4dcef17ef91e8c387f7',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getYieldFlowPools(ctx, poolAddresses)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getYieldFlowBalances,
  })

  return {
    groups: [{ balances }],
  }
}
