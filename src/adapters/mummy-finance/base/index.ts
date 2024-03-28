import { getMMXStakerBalances, getMMYStakeBalance } from '@adapters/mummy-finance/common/balance'
import { getMMYLPContract, getMMYXContract } from '@adapters/mummy-finance/common/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vault: Contract = {
  chain: 'base',
  address: '0xA6D7D0e650aa40FFa42d845A354c12c2bc0aB15f',
}

const fMMY: Contract = {
  chain: 'base',
  address: '0xcebc8a8b66de9b3f4393966eab86fc9de26b2529',
}

const sMMY: Contract = {
  chain: 'base',
  address: '0xFfB69477FeE0DAEB64E7dE89B57846aFa990e99C',
}

export const getContracts = async (ctx: BaseContext) => {
  const [mmylp, mmyx] = await Promise.all([getMMYLPContract(ctx, fMMY, vault), getMMYXContract(ctx, sMMY)])
  return {
    contracts: { mmylp, mmyx },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    mmylp: (...args) => getMMYStakeBalance(...args, vault),
    mmyx: getMMXStakerBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1701907200,
}
