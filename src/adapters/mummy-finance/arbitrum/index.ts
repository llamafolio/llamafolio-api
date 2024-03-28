import { getMMXStakerBalances, getMMYStakeBalance } from '@adapters/mummy-finance/common/balance'
import { getMMYLPContract, getMMYXContract } from '@adapters/mummy-finance/common/contract'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vault: Contract = {
  chain: 'arbitrum',
  address: '0x304951d7172bCAdA54ccAC1E4674862b3d5b3d5b',
}

const fMMY: Contract = {
  chain: 'arbitrum',
  address: '0xad96d9736484e35985773bdf7dba5750dc830042',
}

const sMMY: Contract = {
  chain: 'arbitrum',
  address: '0x52cC60893d3Bd8508baAB835620CbF9ddfA0A13C',
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
  startDate: 1688601600,
}
