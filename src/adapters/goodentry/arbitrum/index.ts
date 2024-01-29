import { getGoodEntryLPs } from '@adapters/goodentry/arbitrum/balance'
import { getGoodEntryContracts } from '@adapters/goodentry/arbitrum/pool'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolsAddresses: `0x${string}`[] = [
  '0x819356bf26d384e7e70cd26c07fc807e6b354f08',
  '0xbb59f5324fea11e538fc7f46c3c7bfe5ad36e8b9',
  '0x41d0ebb0f0bcf7a06e395d0551cc695e4318594d',
  '0x48e455852669adb747b3d16f2bd8b541d696b697',
  '0x0d3caa624e3a0076a6bc96ba8d632d37f460bc74',
  '0x14475be7d59895739207a9e5518903f4b94345b7',
  '0xa82577af74ae9d450dc04df62fc5c14748a0b3ae',
  '0xdcc16defe27cd4c455e5520550123b4054d1b432',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getGoodEntryContracts(ctx, poolsAddresses)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getGoodEntryLPs,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1683072000,
}
