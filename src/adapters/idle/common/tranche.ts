import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

const abi = {
  AATranche: {
    inputs: [],
    name: 'AATranche',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  BBTranche: {
    inputs: [],
    name: 'BBTranche',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  strategyToken: {
    inputs: [],
    name: 'strategyToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  tranchePrice: {
    inputs: [{ internalType: 'address', name: '_tranche', type: 'address' }],
    name: 'tranchePrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface OutputResponse {
  output: bigint
}

export async function getIdleTranchePools(ctx: BaseContext, cdos: `0x${string}`[]): Promise<Contract[]> {
  const [aaTranches, bbTranches, tokens, underlyings] = await Promise.all([
    multicall({ ctx, calls: cdos.map((cdo) => ({ target: cdo }) as const), abi: abi.AATranche }),
    multicall({ ctx, calls: cdos.map((cdo) => ({ target: cdo }) as const), abi: abi.BBTranche }),
    multicall({ ctx, calls: cdos.map((cdo) => ({ target: cdo }) as const), abi: abi.strategyToken }),
    multicall({ ctx, calls: cdos.map((cdo) => ({ target: cdo }) as const), abi: abi.token }),
  ])

  return mapMultiSuccessFilter(
    aaTranches.map((_, i) => [aaTranches[i], bbTranches[i], tokens[i], underlyings[i]]),

    (res, index) => {
      const cdo = cdos[index]
      const [{ output: aaTranche }, { output: bbTranche }, { output: token }, { output: underlying }] =
        res.inputOutputPairs

      return [
        { chain: ctx.chain, address: aaTranche, token: token, underlyings: [underlying], cdo, trancheId: 'AA' },
        { chain: ctx.chain, address: bbTranche, token: token, underlyings: [underlying], cdo, trancheId: 'BB' },
      ]
    },
  ).flat()
}

export async function getIdleTrancheBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalances, tranchePrices] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.cdo, params: [pool.address] }) as const),
      abi: abi.tranchePrice,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], tranchePrices[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlying = pool.underlyings![0] as Contract
      const [{ output: userBalance }, { output: pricePerFullShare }] = res.inputOutputPairs as OutputResponse[]

      if (!underlying) return null

      const underlyings = [{ ...underlying, amount: (userBalance * pricePerFullShare) / 10n ** BigInt(pool.decimals!) }]

      return {
        ...pool,
        amount: userBalance,
        underlyings,
        rewards: undefined,
        category: 'farm' as Category,
      }
    },
  ).filter(isNotNullish)
}
