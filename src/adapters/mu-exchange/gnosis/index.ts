import { getsDaiBalances } from '@adapters/mu-exchange/gnosis/balance'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const msDAI: Contract = {
  chain: 'gnosis',
  address: '0x0d80d7f7719407523a09ee2ef7ed573e0ea3487a',
  token: '0xaf204776c7245bf4147c2612bf6e5972ee483701',
  underlyings: ['0xe91d153e0b41518a2ce8dd3d7944fa863463a97d'],
}

export const getContracts = async (_ctx: BaseContext) => {
  return {
    contracts: { msDAI },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    msDAI: getsDaiBalances,
  })

  return {
    groups: [{ balances }],
  }
}
