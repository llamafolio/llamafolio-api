import type { AdapterConfig } from "@lib/adapter";import { getGitCoinBalances } from '@adapters/gitcoin/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const xGTC: Contract = {
  chain: 'ethereum',
  address: '0x0e3efd5be54cc0f4c64e0d186b0af4b7f2a0e95f',
  token: '0xDe30da39c46104798bB5aA3fe8B9e0e1F348163F',
}

export const getContracts = () => {
  return {
    contracts: { xGTC },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    xGTC: getGitCoinBalances,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1675900800,
                  }
                  