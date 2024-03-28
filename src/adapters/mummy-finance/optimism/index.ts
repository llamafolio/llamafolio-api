import { getMMYStakeBalance } from '@adapters/mummy-finance/common/balance'
import { getMMYLPContract } from '@adapters/mummy-finance/common/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vault: Contract = {
  chain: 'optimism',
  address: '0xA6D7D0e650aa40FFa42d845A354c12c2bc0aB15f',
}

const fMMY: Contract = {
  chain: 'optimism',
  address: '0xffb69477fee0daeb64e7de89b57846afa990e99c',
}

export const getContracts = async (ctx: BaseContext) => {
  const mmylp = await getMMYLPContract(ctx, fMMY, vault)
  return {
    contracts: { mmylp },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    mmylp: (...args) => getMMYStakeBalance(...args, vault),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1678492800,
}
