import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getDepositBalances, getStakeBalances, getYieldBalances } from './balance'

const usdcPool: Contract = {
  chain: 'arbitrum',
  address: '0x958cc92297e6F087f41A86125BA8E121F0FbEcF2',
  underlyings: ['0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'], // USDC
}

const ethPool: Contract = {
  chain: 'arbitrum',
  address: '0xE0cCd451BB57851c1B2172c07d8b4A7c6952a54e',
  underlyings: ['0x82af49447d8a07e3bd95bd0d56f35241523fbab1'], // WETH
}

const capPool: Contract = {
  chain: 'arbitrum',
  address: '0xc8cdd2ea6a5149ced1f2d225d16a775ee081c67d',
  underlyings: ['0x031d35296154279DC1984dCD93E392b1f946737b'], // CAP
}

const capYield: Contract = {
  chain: 'arbitrum',
  address: '0x3e4cdcdc5e3f46dce516adb428d107ce62a6d24a',
  lpToken: '0xf16033d20adda47dc99ea291d0f4c4fef2ff47af',
}

export const getContracts = () => {
  return {
    contracts: { pools: [usdcPool, ethPool], capPool, capYield },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getDepositBalances,
    capPool: getStakeBalances,
    capYield: getYieldBalances,
  })

  return {
    groups: [{ balances }],
  }
}
