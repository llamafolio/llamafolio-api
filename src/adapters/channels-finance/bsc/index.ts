import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMarketsBalances, getMarketsContracts } from '@lib/compound/v2/market'

const comptroller: Contract = {
  chain: 'bsc',
  address: '0x8Cd2449Ed0469D90a7C4321DF585e7913dd6E715',
}

const comptroller_v1: Contract = {
  chain: 'bsc',
  address: '0xfc518333f4bc56185bdd971a911fce03dee4fc8c',
}

export const getContracts = async (ctx: BaseContext) => {
  const [markets, markets_v1] = await Promise.all([
    getMarketsContracts(ctx, {
      comptrollerAddress: comptroller.address,
      underlyingAddressByMarketAddress: {
        // // cBNB -> BNB
        '0x14e134365f754496fbc70906b8611b8b49f66dd4': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
      },
    }),
    getMarketsContracts(ctx, {
      comptrollerAddress: comptroller_v1.address,
      underlyingAddressByMarketAddress: {
        // // cBNB -> BNB
        '0x14e134365f754496fbc70906b8611b8b49f66dd4': '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
      },
    }),
  ])

  return {
    contracts: {
      markets,
      markets_v1,
    },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    markets: getMarketsBalances,
    markets_v1: getMarketsBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1638835200,
                  }
                  