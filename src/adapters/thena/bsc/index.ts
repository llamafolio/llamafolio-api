import { getThenaBalances } from '@adapters/thena/bsc/balance'
import { getThenaContracts } from '@adapters/thena/bsc/pair'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getNFTLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'

const THE: Token = {
  chain: 'bsc',
  address: '0xf4c8e32eadec4bfe97e0f595add0f4450a863a11',
  decimals: 18,
  symbol: 'THE',
}

const voter: Contract = {
  name: 'VoterV3',
  chain: 'bsc',
  address: '0x3a1d0952809f4948d15ebce8d345962a282c4fcb',
}

const locker: Contract = {
  chain: 'bsc',
  address: '0xfbbf371c9b0b994eebfcc977cef603f7f31c070d',
}

const deployers = ['0x993Ae2b514677c7AC52bAeCd8871d2b362A9D693']

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getThenaContracts(ctx, voter)

  return {
    contracts: { pools, locker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: (...args) => getThenaBalances(...args, THE),
    locker: (...args) => getNFTLockerBalances(...args, THE, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}
