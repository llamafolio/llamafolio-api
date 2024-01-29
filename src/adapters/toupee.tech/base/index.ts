import type { AdapterConfig } from "@lib/adapter";import { getToupeeFarmBalances } from '@adapters/toupee.tech/base/balance'
import { getToupeeContracts } from '@adapters/toupee.tech/base/contract'
import { getToupeeLendBalances } from '@adapters/toupee.tech/base/lend'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const lendingPool: Contract = {
  chain: 'base',
  address: '0x60c08737877a5262bdb1c1cac8fb90b5e5b11515',
}

const controller: Contract = {
  chain: 'base',
  address: '0x1Eeb34B653d396Cdc60A9C434C09E1803dd4904E',
}

const oWIG: Contract = {
  chain: 'base',
  address: '0xbe1053ec4ac137c9a5b4462d53d5c2c0b89a2b79',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getToupeeContracts(ctx, controller)

  return {
    contracts: { lendingPool, pools, oWIG },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lendingPool: getToupeeLendBalances,
    pools: getToupeeFarmBalances,
    oWIG: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1700352000,
                  }
                  