import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getBalancesOf } from '@lib/erc20'
import { getPricesPerShares } from '@lib/pricePerShare'

const abi = {}

export async function getOpiumBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [balances, pricePerFullShares] = await Promise.all([
    getBalancesOf(ctx, pools, { getAddress: (contract) => contract.address }),
    getPricesPerShares(ctx, pools),
  ])

  console.log(balances, pricePerFullShares)
}
