import { getTProtocolBalances } from '@adapters/tprotocol/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const wTBT: Contract = {
  chain: 'ethereum',
  address: '0xd38e031f4529a07996aab977d2b79f0e00656c56',
  decimals: 18,
  symbol: 'wTBT',
}

export const getContracts = () => {
  return {
    contracts: { wTBT },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    wTBT: getTProtocolBalances,
  })

  return {
    groups: [{ balances }],
  }
}
