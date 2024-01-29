import type { AdapterConfig } from "@lib/adapter";import type { Balance, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getGaugesBalances } from '@lib/curve/gauge'
import { getCurvePoolBalances } from '@lib/curve/lp'
import { getCurvePools } from '@lib/curve/pool'

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getCurvePools(ctx)

  return {
    contracts: {
      pools,
    },
    revalidate: 60 * 60,
  }
}

async function getCurveBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[][]> {
  return Promise.all([getCurvePoolBalances(ctx, pools), getGaugesBalances(ctx, pools)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getCurveBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1622678400,
                  }
                  