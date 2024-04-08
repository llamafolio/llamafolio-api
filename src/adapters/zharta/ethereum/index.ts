import { getZhartaStakeBalances } from '@adapters/zharta/ethereum/balance'
import { getZhartaStakersContracts } from '@adapters/zharta/ethereum/contract'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stakersAddresses: `0x${string}`[] = [
  '0xa5df70a7b426f077e24b6365237fc9ccfde5ea10',
  '0x8d0f9c9fa4c1b265cd5032fe6ba4fefc9d94badb',
  '0x1f88e85ffd826081d59f295a7335cf7de92a7c41',
]

export const getContracts = async (ctx: BaseContext) => {
  const stakers = await getZhartaStakersContracts(ctx, stakersAddresses)
  return {
    contracts: { stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getZhartaStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1669248000,
}
