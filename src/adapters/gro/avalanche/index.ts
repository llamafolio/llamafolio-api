import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getYieldBalances } from '../common/balance'
import { getYieldContracts } from '../common/contract'

const poolsAddresses: `0x${string}`[] = [
  '0x2eb05cffa24309b9aaf300392a4d8db745d4e592', // USDC.e
  '0x6063597b9356b246e706fd6a48c780f897e3ef55', // DAI.e
  '0x471f4b4b9a97f82c3a25b034b33a8e306ee9beb5', // USDT.e
  '0x6ef44077a1f5e10cdfccc30efb7dcdb1d5475581', // USDT.e
  '0x57daed1ee021be9991f5d30cf494b6b09b5b449e', // USDC.e
  '0x6518beca1c20221cf6e8ba6f77b85818d1a298e7', // USDC.e
  '0x5e57e11483a3f60a76af3045303604522059da2a', // DAI.e
  '0x48cb6fd436d34a909523a74de8f82d6bf59e6a3c', // USDC.e
  '0x82e40e1626ebb4076419b49b9403d9ce2425b956', // DAI.e
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getYieldContracts(ctx, poolsAddresses)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getYieldBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1639440000,
                  }
                  