import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { getBalancesOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  underlying: {
    constant: true,
    inputs: [],
    name: 'underlying',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getKineLpPools(ctx: BaseContext, lpAddresses: `0x${string}`[]): Promise<Contract[]> {
  const underlyings = await multicall({
    ctx,
    calls: lpAddresses.map((lp) => ({ target: lp }) as const),
    abi: abi.underlying,
  })

  return mapSuccessFilter(underlyings, (res) => ({
    chain: ctx.chain,
    address: res.input.target,
    underlyings: [res.output],
  }))
}

export async function getKineLpBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalances = await getBalancesOf(ctx, pools)

  return userBalances.map((balance) => ({
    ...balance,
    decimals: balance.underlyings![0].decimals!,
    underlyings: [balance.underlyings?.[0] as Contract],
    category: 'lp',
  }))
}
