import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

export async function getStakeBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOfsRes = await multicall({
    ctx,
    calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
    abi: abi.balanceOf,
  })

  for (let idx = 0; idx < contracts.length; idx++) {
    const contract = contracts[idx]
    const underlying = contract.underlyings?.[0] as Contract

    const balanceOfRes = balanceOfsRes[idx]

    if (!balanceOfRes.success) {
      continue
    }

    balances.push({
      chain: ctx.chain,
      address: underlying.address,
      decimals: underlying.decimals,
      symbol: underlying.symbol,
      amount: balanceOfRes.output,
      category: 'stake',
    })
  }

  return balances
}
