import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getRatiosForFarm: {
    constant: true,
    inputs: [{ internalType: 'uint256', name: 'poolIndex', type: 'uint256' }],
    name: 'getRatiosForFarm',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const BASE: Contract = {
  chain: 'base',
  address: '0xd07379a755a8f11b57610154861d694b2a0f615a',
  decimals: 18,
  symbol: 'BASE',
}

const xBASE: Contract = {
  chain: 'base',
  address: '0xef94c12ba5bb2bf56e19babfa56880487fea6e82',
  decimals: 18,
  symbol: 'xBASE',
}

export async function getSwapBasedPoolBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterChef: Contract,
): Promise<Balance[]> {
  const [userBalances, userPendingsRewards, rewardsRatios] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: masterChef.address, params: [pool.pid] }) as const),
      abi: abi.getRatiosForFarm,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], userPendingsRewards[i], rewardsRatios[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlyings = pool.underlyings as Contract[]
      const [{ output: amount }, { output: earned }, { output: ratios }] = res.inputOutputPairs

      const rewards = [BASE, xBASE].map((token, index: any) => {
        const ratio: bigint = ratios[index] ?? 0n
        return { ...token, amount: (earned * ratio) / BigInt(1e5) }
      })

      return {
        ...pool,
        amount,
        underlyings,
        rewards,
        category: 'farm',
      }
    },
  )

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}
