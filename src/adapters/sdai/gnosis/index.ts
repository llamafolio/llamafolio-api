import { getsDAIBalance } from '@adapters/sdai/gnosis/balance'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const xDAI: Contract = {
  chain: 'gnosis',
  address: '0xaf204776c7245bf4147c2612bf6e5972ee483701',
  underlyings: ['0xe91d153e0b41518a2ce8dd3d7944fa863463a97d'],
}

export const getContracts = async (_ctx: BaseContext) => {
  return {
    contracts: { xDAI },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    xDAI: getsDAIBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1696550400,
}
