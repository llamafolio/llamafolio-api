import { getNodeEtherFiBalances } from '@adapters/ether.fi/ethereum/node'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

import { getEtherBalances, getWeETHBalance } from './stake'

const manager: Contract = {
  chain: 'ethereum',
  address: '0x3d320286E014C3e1ce99Af6d6B00f0C1D63E3000',
}

const nodeStaker: Contract = {
  chain: 'ethereum',
  address: '0xb49e4420ea6e35f98060cd133842dbea9c27e479',
  token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0x7623e9dc0da6ff821ddb9ebaba794054e078f8c4',
}

const eETH: Contract = {
  chain: 'ethereum',
  address: '0x35fa164735182de50811e8e2e824cfb9b6118ac2',
  token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
}

const weETH: Contract = {
  chain: 'ethereum',
  address: '0xcd5fe23c85820f7b72d0926fc9b05b43e359b7ee',
  token: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
}

export const getContracts = () => {
  return {
    contracts: { staker, manager, eETH, weETH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    manager: (...args) => getNodeEtherFiBalances(...args, nodeStaker),
    staker: getEtherBalances,
    weETH: getWeETHBalance,
    eETH: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1677715200,
}
