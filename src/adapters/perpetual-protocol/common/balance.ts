import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { parseEther } from 'viem'

const abi = {
  getAccountValue: {
    inputs: [{ internalType: 'address', name: 'trader', type: 'address' }],
    name: 'getAccountValue',
    outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getMinter: {
    inputs: [],
    name: 'getMinter',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalAssets: {
    inputs: [],
    name: 'totalAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface OutputPair {
  output: bigint
}

export async function getPerpStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getAccountValue })

  return {
    ...staker,
    amount: userBalance,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}

export async function getPerpFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const getMinterAddresses = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address }) as const),
    abi: abi.getMinter,
  })

  const [userBalances, sharesSupplies, tokenSupplies] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address }) as const), abi: erc20Abi.totalSupply }),
    multicall({
      ctx,
      calls: mapSuccessFilter(getMinterAddresses, (res) => ({ target: res.output }) as const),
      abi: abi.totalAssets,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], sharesSupplies[i], tokenSupplies[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlying = pool.underlyings![0] as Contract

      if (!underlying) return null

      const [{ output: userBalance }, { output: shareBalance }, { output: assetBalance }] =
        res.inputOutputPairs as OutputPair[]

      const parseShare = shareBalance / parseEther('1.0')
      const underlyingsAmount = (userBalance * assetBalance) / parseShare / 10n ** BigInt(underlying.decimals!)

      return {
        ...pool,
        amount: userBalance,
        decimals: 18,
        underlyings: [{ ...underlying, amount: underlyingsAmount, decimals: 18 }],
        rewards: undefined,
        category: 'farm' as Category,
      }
    },
  ).filter(isNotNullish)
}
