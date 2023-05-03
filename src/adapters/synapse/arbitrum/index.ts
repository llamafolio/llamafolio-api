import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getSynapseContracts } from '../common/contract'
import { getSynapseBalances } from '../common/farm'

const SYN: Token = {
  chain: 'arbitrum',
  address: '0x080f6aed32fc474dd5717105dba5ea57268f46eb',
  decimals: 18,
  symbol: 'SYN',
}

const miniChef: Contract = {
  chain: 'arbitrum',
  address: '0x73186f2Cf2493f20836b17b21ae79fc12934E207',
  pool: [
    '0xa067668661C84476aFcDc6fA5D758C4c01C34352',
    '0x84cd82204c07c67dF1C2C372d8Fd11B3266F76a3',
    '0x0Db3FE3B770c95A0B99D1Ed6F2627933466c0Dd8',
    '0x9Dd329F5411466d9e0C488fF72519CA9fEf0cb40',
  ],
  rewards: [SYN],
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getSynapseContracts(ctx, miniChef)

  return {
    contracts: { miniChef, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getSynapseBalances(...args, miniChef),
  })

  return {
    groups: [{ balances }],
  }
}
