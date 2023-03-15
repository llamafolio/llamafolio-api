import { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'

import { getGroBalances } from '../common/balance'
import { getGroContracts } from '../common/contract'
import { getGroVestingBalances } from '../common/vest'

const GRO: Token = {
  chain: 'ethereum',
  address: '0x3Ec8798B81485A254928B70CDA1cf0A2BB0B74D7',
  decimals: 18,
  symbol: 'GRO',
}

const vester: Contract = {
  chain: 'ethereum',
  address: '0x748218256afe0a19a88ebeb2e0c5ce86d2178360',
  underlyings: [GRO],
}

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0x2e32bad45a1c29c1ea27cf4dd588df9e68ed376c',
  vester: vester,
  rewards: [GRO],
}

export const getContracts = async (ctx: BaseContext) => {
  const contracts = await getGroContracts(ctx, masterChef)

  return {
    contracts: { vester, masterChef, contracts },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vester: getGroVestingBalances,
    contracts: (...args) => getGroBalances(...args, masterChef),
  })

  return {
    groups: [{ balances }],
  }
}
