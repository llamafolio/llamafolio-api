import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall, type MultiCallResult } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export type IBalancerBalance = Balance & {
  poolId: `0x${string}`
}

interface Params {
  getAddress: (poolbalance: IBalancerBalance) => `0x${string}`
  getCategory: (poolbalance: IBalancerBalance) => Category
}

interface BasicResolverArgs {
  ctx: BalancesContext
  balances: Balance[]
}

const getUnderlyingsBalances: { [key: string]: (args: any) => Promise<Balance[]> } = {
  balancer: ({ ctx, balances, vault, params }: any) => getUnderlyingsBalancesFromBalancer(ctx, balances, vault, params),
}

export async function resolveUnderlyingsBalances<T extends BasicResolverArgs>(
  provider: string,
  resolverArgs: T,
): Promise<Balance[]> {
  return getUnderlyingsBalances[provider](resolverArgs)
}

export async function getUnderlyingsBalancesFromBalancer(
  ctx: BalancesContext,
  poolbalances: IBalancerBalance[],
  vault: Contract,
  params: Params = {
    getAddress: (poolbalance: IBalancerBalance) => poolbalance.address,
    getCategory: (poolbalance: IBalancerBalance) => poolbalance.category,
  },
): Promise<Balance[]> {
  const [underlyingsBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: poolbalances.map((balance) => ({ target: vault.address, params: [balance.poolId] }) as const),
      abi: abi.getPoolTokens,
    }),
    multicall({
      ctx,
      calls: poolbalances.map((balance) => ({ target: params.getAddress(balance) }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  return mapMultiSuccessFilter(
    underlyingsBalancesRes.map((_, i) => [underlyingsBalancesRes[i], totalSuppliesRes[i]]),
    (res, index) => {
      const poolBalance = poolbalances[index]
      const { underlyings, rewards } = poolBalance as { underlyings: Contract[]; rewards: Contract[] }
      const [{ output: underlyingsBalances }, { output: totalSupply }] = res.inputOutputPairs

      if (totalSupply === 0n) return null

      underlyings.forEach((underlying, idx) => {
        underlying.amount = underlyingsBalances[1][idx]
      })

      const lpTokenBalance = underlyings.find(
        (underlying) => underlying.address.toLowerCase() === poolBalance.address.toLowerCase(),
      )

      const fmtUnderlyings = underlyings
        .map((underlying) => {
          const realSupply = lpTokenBalance ? totalSupply - lpTokenBalance.amount : totalSupply
          const amount = (underlying.amount * poolBalance.amount) / realSupply

          return {
            ...underlying,
            amount,
          }
        })
        .filter((underlying) => underlying.address.toLowerCase() !== poolBalance.address.toLowerCase())

      return {
        ...(poolBalance as Contract),
        underlyings: fmtUnderlyings,
        rewards,
        category: params.getCategory(poolBalance),
      }
    },
  ).filter(isNotNullish) as Balance[]
}

export function mapMultiSuccessFilter<T extends MultiCallResult<never>[], S>(
  results: { [K in keyof T]: T[K][] },
  mapFn: (
    res: {
      success: true
      inputOutputPairs: {
        [K in keyof T]: {
          input: T[K]['input']
          output: any
        }
      }
    },
    index: number,
  ) => S | null,
): S[] {
  return results
    .map((resArray, index) => {
      const inputOutputPairs = resArray.map((res) => ({ input: res.input, output: res.output })) as {
        [K in keyof T]: {
          input: T[K]['input']
          output: NonNullable<T[K]['output']>
        }
      }

      const allSuccess = resArray.every((res) => res.success)
      return allSuccess ? mapFn({ success: true, inputOutputPairs }, index) : null
    })
    .filter(isNotNullish)
}
