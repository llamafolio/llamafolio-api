import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getLpLyraBalances } from '../common/lp'
import { getLyraStakeBalances } from '../common/stake'

const lyraEthMarketLp: Contract = {
  chain: 'arbitrum',
  address: '0xb619913921356904bf62aba7271e694fd95aa10d',
  decimals: 18,
  symbol: 'Ly-wETH-pt',
  underlyings: ['0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'],
  lpToken: '0xb619913921356904bf62aba7271e694fd95aa10d',
  staker: '0xbdf4e630ded14a129ae302f930d1ae1b40fd02aa',
}

const lyraBTCMarketLp: Contract = {
  chain: 'arbitrum',
  address: '0xec6f3ef9481e7b8484290edbae2cedcdb0ce790e',
  decimals: 18,
  symbol: 'Ly-wBTC-pt',
  underlyings: ['0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'],
  lpToken: '0xec6f3ef9481e7b8484290edbae2cedcdb0ce790e',
  staker: '0xbb6d72147280a2147a23ce196326e0547eaec401',
}

const stakers: Contract[] = [
  {
    chain: 'arbitrum',
    address: '0x5b237ab26ced47fb8ed104671819c801aa5ba45e',
    decimals: 18,
    underlyings: ['0x079504b86d38119f859c4194765029f692b7b7aa'],
    symbol: 'stkLYRA',
    rewards: ['0x079504b86d38119f859c4194765029f692b7b7aa'],
  },
]

export const getContracts = () => {
  return {
    contracts: { lpMarkets: [lyraEthMarketLp, lyraBTCMarketLp], stakers },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    lpMarkets: getLpLyraBalances,
    stakers: getLyraStakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
