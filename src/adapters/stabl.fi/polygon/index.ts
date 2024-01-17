import { getStableFiBalance } from '@adapters/stabl.fi/polygon/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const CASH: Contract = {
  chain: 'polygon',
  address: '0x5d066d022ede10efa2717ed3d79f22f949f8c175',
  underlyings: [
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  ],
}

export const getContracts = () => {
  return {
    contracts: { CASH },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    CASH: getStableFiBalance,
  })

  return {
    groups: [{ balances }],
  }
}
