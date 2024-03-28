import { getMMXStakerBalances, getMMYStakeBalance } from '@adapters/mummy-finance/common/balance'
import { getMMYLPContract, getMMYXContract } from '@adapters/mummy-finance/common/contract'
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

const sMMY: Contract = {
  chain: 'optimism',
  address: '0x04f23404553fcc388Ec73110A0206Dd2E76a6d95',
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
  startDate: 1678492800,
}
