import { getOUSGStakeBalance } from '@adapters/ondo-finance/ethereum/balance'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const OUSG: Contract = {
  chain: 'ethereum',
  address: '0x1b19c19393e2d034d8ff31ff34c81252fcbbee92',
  underlyings: ['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'],
}

const cashManager: Contract = {
  chain: 'ethereum',
  address: '0x3501883a646f1F8417BcB62162372550954D618f',
}

export const getContracts = () => {
  return {
    contracts: { OUSG },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    OUSG: (...args) => getOUSGStakeBalance(...args, cashManager),
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1674777600,
}
