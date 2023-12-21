import { getOpiumBalances } from '@adapters/opium/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const wOPIUM: Contract = {
  chain: 'ethereum',
  address: '0x7a8d51b82b36fa5b50fb77001d6d189e920d2f75',
  underlyings: ['0x888888888889c00c67689029d7856aac1065ec11'],
}

const osETHPool: Contract = {
  chain: 'ethereum',
  address: '0x71add67302162637bedcf47fd39b49fd5d321904',
  token: '0xf1c9acdc66974dfb6decb12aa385b9cd01190e38',
}

const inchPool: Contract = {
  chain: 'ethereum',
  address: '0xec5bd46a5085bdfffcf0e89f1029bb0fb59f9ee0',
  token: '0x111111111117dc0aa78b770fa6a738034120c302',
}

export const getContracts = () => {
  return {
    contracts: { wOPIUM, pools: [inchPool] },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    wOPIUM: getSingleStakeBalance,
    pools: getOpiumBalances,
  })

  return {
    groups: [{ balances }],
  }
}
