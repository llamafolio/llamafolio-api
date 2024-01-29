import type { AdapterConfig } from "@lib/adapter";import { getCVaultContracts } from '@adapters/cvault-finance/ethereum/contract'
import { getCVaultFarmBalances } from '@adapters/cvault-finance/ethereum/farm'
import { getCVaultLendBalances } from '@adapters/cvault-finance/ethereum/lend'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const lendingPool: Contract = {
  chain: 'ethereum',
  address: '0x54b276c8a484ebf2a244d933af5ffaf595ea58c5',
}

const masterchef: Contract = {
  chain: 'ethereum',
  address: '0xc5cacb708425961594b63ec171f4df27a9c0d8c9',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getCVaultContracts(ctx, masterchef)

  return {
    contracts: { lendingPool, pools },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lendingPool: getCVaultLendBalances,
    pools: (...args) => getCVaultFarmBalances(...args, masterchef),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1660176000,
                  }
                  