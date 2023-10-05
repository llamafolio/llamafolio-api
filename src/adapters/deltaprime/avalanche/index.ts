import { getDeltaFarmBalances } from '@adapters/deltaprime/avalanche/balance'
import { getDeltaPools } from '@adapters/deltaprime/avalanche/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = [
  '0x2323dac85c6ab9bd6a8b5fb75b0581e31232d12b',
  '0xd26e504fc642b96751fd55d3e68af295806542f5',
  '0x475589b0ed87591a893df42ec6076d2499bb63d0',
  '0xd222e10d7fe6b7f9608f14a8b5cf703c74efbca1',
  '0xd7feb276ba254cd9b34804a986ce9a8c3e359148',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getDeltaPools(ctx, poolAddresses)

  return {
    contracts: { pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getDeltaFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}
