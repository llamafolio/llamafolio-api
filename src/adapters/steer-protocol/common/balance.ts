import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getBalancesOf } from '@lib/erc20'
import request, { gql } from 'graphql-request'

export async function getSteerBalances(ctx: BalancesContext, pools: Contract[], graph: string): Promise<Balance[]> {
  const balances = (await getBalancesOf(ctx, pools)).filter((balance) => balance.amount > 0n)
  return getSteerInternalBalances(balances, graph)
}

async function getSteerInternalBalances(rawBalances: Balance[], graph: string): Promise<Balance[]> {
  const balances: any[] = []

  const query = gql`
    query vaults {
      vaults(first: 1000) {
        id
        token0
        token0Balance
        token1
        token1Balance
        totalLPTokensIssued
      }
    }
  `
  const { vaults }: any = await request(graph, query)

  rawBalances.forEach((balance) => {
    const lowerCaseAddress = balance.address.toLowerCase()
    const matchingVault = vaults.find((vault: any) => vault.id.toLowerCase() === lowerCaseAddress)

    if (matchingVault) {
      balances.push({
        ...matchingVault,
        ...balance,
      })
    }
  })

  return balances.map((balance) => {
    const supply = BigInt(balance.totalLPTokensIssued)
    const [token0, token1] = balance.underlyings as Contract[]
    const underlyng0 = { ...token0, amount: (BigInt(balance.token0Balance) * balance.amount) / supply }
    const underlyng1 = { ...token1, amount: (BigInt(balance.token1Balance) * balance.amount) / supply }

    return { ...balance, underlyings: [underlyng0, underlyng1], category: 'farm' }
  })
}
