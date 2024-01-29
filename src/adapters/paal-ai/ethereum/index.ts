import type { AdapterConfig } from "@lib/adapter";import { getPaalLockersBalances, getPaalLockersContracts } from '@adapters/paal-ai/ethereum/lock'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const locking14days = '0x85e253162C7e97275b703980F6b6fA8c0469D624'
const locking28days = '0x163Ad6AC78FFE40E194310faEaDA8f6615942d7b'
const locking56days = '0x8431060c8e72793aFaDA261E9DD0Ab950e80894F'

export const getContracts = async (ctx: BaseContext) => {
  const lockers = await getPaalLockersContracts(ctx, [locking14days, locking28days, locking56days])

  return {
    contracts: { lockers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lockers: getPaalLockersBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1700352000,
                  }
                  