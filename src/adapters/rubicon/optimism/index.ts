import { getRubiconPoolBalances } from '@adapters/rubicon/optimism/balance'
import { getRubiconPools } from '@adapters/rubicon/optimism/pool'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolsAddresses: `0x${string}`[] = [
  '0xB0bE5d911E3BD4Ee2A8706cF1fAc8d767A550497', // bathETH
  '0x7571CC9895D8E997853B1e0A1521eBd8481aa186', // bathWBTC
  '0xe0e112e8f33d3f437D1F895cbb1A456836125952', // bathUSDC
  '0x60daEC2Fc9d2e0de0577A5C708BcaDBA1458A833', // bathDAI
  '0xfFBD695bf246c514110f5DAe3Fa88B8c2f42c411', // bathUSDT
  '0xeb5F29AfaaA3f44eca8559c3e8173003060e919f', // bathSNX
  '0x574a21fE5ea9666DbCA804C9d69d8Caf21d5322b', // bathOP
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getRubiconPools(ctx, poolsAddresses)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getRubiconPoolBalances,
  })

  return {
    groups: [{ balances }],
  }
}
