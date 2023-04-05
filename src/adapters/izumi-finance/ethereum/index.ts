import { factory } from '@adapters/uniswap-v3/ethereum'
import { nonFungiblePositionManager } from '@adapters/uniswap-v3/ethereum'
import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getNFTLockerBalances } from '@lib/lock'
import { Token } from '@lib/token'

import { getIzumiBalances } from '../common/balance'

const IZI: Token = {
  chain: 'ethereum',
  address: '0x9ad37205d608B8b219e6a2573f922094CEc5c200',
  decimals: 18,
  symbol: 'IZI',
}

const pools: Contract[] = [
  { chain: 'ethereum', address: '0x461b154b688d5171934d70f991c17d719082710c' },
  { chain: 'ethereum', address: '0xbe138ad5d41fdc392ae0b61b09421987c1966cc3' },
]

const nftlocker: Contract = {
  chain: 'ethereum',
  address: '0xb56a454d8dac2ad4cb82337887717a2a427fcd00',
  decimals: 18,
  symbol: 'veIZI',
}

export const getContracts = () => {
  return {
    contracts: { nftlocker, pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    nftlocker: (...args) => getNFTLockerBalances(...args, IZI, 'nftLocked'),
    pools: (...args) => getIzumiBalances(...args, nonFungiblePositionManager, factory, IZI),
  })

  return {
    groups: [{ balances }],
  }
}
