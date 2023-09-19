import { getThenaBalances } from '@adapters/thena/bsc/balance'
import { getThenaContracts } from '@adapters/thena/bsc/pair'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getNFTLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'

const THE: Token = {
  chain: 'bsc',
  address: '0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11',
  decimals: 18,
  symbol: 'THE',
}

const voter: Contract = {
  chain: 'bsc',
  address: '0x3A1D0952809F4948d15EBCe8d345962A282C4fCb',
}

const locker: Contract = {
  chain: 'bsc',
  address: '0xfbbf371c9b0b994eebfcc977cef603f7f31c070d',
}

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
