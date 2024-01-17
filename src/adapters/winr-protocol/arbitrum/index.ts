import { getOldWLPBalance, getvWINRBalances, getWLPBalance } from '@adapters/winr-protocol/arbitrum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vWINR: Contract = {
  chain: 'arbitrum',
  address: '0xddaecf4b02a3e45b96fc2d7339c997e072b0d034',
  token: '0xD77B108d4f6cefaa0Cae9506A934e825BEccA46E',
}

const WLP: Contract = {
  chain: 'arbitrum',
  address: '0x6f7353B59476dbd1dE23d7113BE7A7fbE6F343E5',
  underlyings: [
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
  ],
}
const oldWLP: Contract = {
  chain: 'arbitrum',
  address: '0xc885b641cb11ce2b38a7c28b79318c4b89cf04f9',
  token: '0x2798419F2Db8ea5F0f3A9b405313801e052B9cA7',
  underlyings: [
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
  ],
}

export const getContracts = () => {
  return {
    contracts: { vWINR, WLP, oldWLP },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vWINR: getvWINRBalances,
    WLP: getWLPBalance,
    oldWLP: getOldWLPBalance,
  })

  return {
    groups: [{ balances }],
  }
}
