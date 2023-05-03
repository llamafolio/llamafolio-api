import type { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Pair } from '@lib/uniswap/v2/factory'

import { getGammaFarmBalances, getGammaMasterchefBalances } from '../common/balance'
import { getPoolContractsFromAPI } from '../common/contract'

const API_URLs = [
  'https://wire2.gamma.xyz/polygon/hypervisors/allData',
  'https://wire2.gamma.xyz/quickswap/polygon/hypervisors/allData',
]

const masterChef: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'polygon',
  address: '0x570d60a60baa356d47fda3017a190a48537fcd7d',
}

const masterChef2: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'polygon',
  address: '0x20ec0d06f447d550fc6edee42121bc8c1817b97d',
}

const masterChef3: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'polygon',
  address: '0xcc54afcecd0d89e0b2db58f5d9e58468e7ad20dc',
}

const masterChef4: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'polygon',
  address: '0x68678cf174695fc2d27bd312df67a3984364ffdd',
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
    getGammaMasterchefBalances(ctx, pairs, [masterChef, masterChef2, masterChef3, masterChef4]),
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
