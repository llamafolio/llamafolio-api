import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Pair } from '@lib/uniswap/v2/factory'

import { getGammaFarmBalances, getGammaMasterchefBalances } from '../common/balance'
import { getPoolContractsFromAPI } from '../common/contract'

const API_URLs = ['https://wire2.gamma.xyz/optimism/hypervisors/allData']

const masterChef: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'optimism',
  address: '0xc7846d1bc4d8bcf7c45a7c998b77ce9b3c904365',
}

const masterChef2: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'optimism',
  address: '0x0c03fc32e8badddbb828042fa5f1da27cec8232c',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getPoolContractsFromAPI(ctx, API_URLs)

  return {
    contracts: { pools },
  }
}

function getGammaPairsBalances(ctx: BalancesContext, pairs: Pair[]) {
  return Promise.all([
    getGammaFarmBalances(ctx, pairs),
    getGammaMasterchefBalances(ctx, pairs, [masterChef, masterChef2]),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (ctx, pools) => getGammaPairsBalances(ctx, pools as Pair[]),
  })

  return {
    groups: [{ balances }],
  }
}
