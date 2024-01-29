import { getLocusFarmBalances } from '@adapters/locus-finance/common/balance'
import { getLocusPools } from '@adapters/locus-finance/common/pool'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const stLOCUS: Contract = {
  chain: 'arbitrum',
  address: '0xEcc5e0c19806Cf47531F307140e8b042D5Afb952',
  token: '0xe1d3495717f9534db67a6a8d4940dd17435b6a9e',
}

const poolsAddresses: `0x${string}`[] = [
  '0x6c090e79a9399c0003a310e219b2d5ed4e6b0428',
  '0x0f094f6deb056af1fa1299168188fd8c78542a07',
  '0xbe55f53ad3b48b3ca785299f763d39e8a12b1f98',
  '0x56c0095dc05d42601d6dfcd7ef320b38a35ae031',
  '0xa3ad082861e47688589f09ff13e767fae4dce50f',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getLocusPools(ctx, poolsAddresses)
  return {
    contracts: { stLOCUS, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stLOCUS: getSingleStakeBalance,
    pools: getLocusFarmBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1691712000,
}
