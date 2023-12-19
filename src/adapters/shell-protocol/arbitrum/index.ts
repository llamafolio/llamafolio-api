import { getShellBalances } from '@adapters/shell-protocol/arbitrum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'arbitrum',
  address: '0xc32eb36f886f638fffd836df44c124074cfe3584',
  underlyings: [
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    '0x5979d7b546e38e414f7e9822514be443a4800529',
    '0x9ed7E4B1BFF939ad473dA5E7a218C771D1569456',
    '0x912ce59144191c1204e64559fe8253a0e49e6548',
    '0x539bde0d7dbd336b79148aa742883198bbf60342',
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
    '0x6694340fc020c5e6b96567843da2df01b2ce1eb6',
  ],
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getShellBalances,
  })

  return {
    groups: [{ balances }],
  }
}
