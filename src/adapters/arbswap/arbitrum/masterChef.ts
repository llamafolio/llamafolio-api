import type { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import type { GetResolvedUnderlyingsParams, GetUsersInfosParams } from '@lib/masterchef/masterChefBalance'
import type { GetUnderlyingsParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  coins: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'coins',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract IArbswapStableSwapLP', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  balances: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'balances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  minter: {
    inputs: [],
    name: 'minter',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingARBS: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingARBS',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface OutputResponse {
  output: bigint
}

export async function getArbSwapUnderlyings(ctx: BaseContext, { pools }: GetUnderlyingsParams): Promise<Contract[]> {
  const variablesPools = await getPairsDetails(ctx, pools)
  const poolsWithUnderlyings = variablesPools.filter((pool) => pool.underlyings)
  const poolsWithoutUnderlyings = variablesPools.filter((pool) => !pool.underlyings)

  const poolAddresses = await multicall({
    ctx,
    calls: poolsWithoutUnderlyings.map((pool) => ({ target: pool.address }) as const),
    abi: abi.minter,
  })

  const [tokens0InPairs, tokens1InPairs] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(poolAddresses, (res) => ({ target: res.output, params: [0n] }) as const),
      abi: abi.coins,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(poolAddresses, (res) => ({ target: res.output, params: [1n] }) as const),
      abi: abi.coins,
    }),
  ])

  const stablePools = mapMultiSuccessFilter(
    tokens0InPairs.map((_, i) => [tokens0InPairs[i], tokens1InPairs[i]]),

    (res, index) => {
      const pool = poolsWithoutUnderlyings[index]
      const [
        {
          input: { target: poolAddress },
          output: token0,
        },
        { output: token1 },
      ] = res.inputOutputPairs

      return {
        ...pool,
        pool: poolAddress,
        underlyings: [token0, token1],
      }
    },
  )

  return [...poolsWithUnderlyings, ...stablePools]
}

export async function getARBSResolvedUnderlyings(
  ctx: BalancesContext,
  { pools }: GetResolvedUnderlyingsParams,
): Promise<Contract[]> {
  const variablePools = pools.filter((pool) => !(pool as Contract).pool)
  const stablePools = pools.filter((pool) => (pool as Contract).pool)

  const variablesPoolsBalances = await getUnderlyingBalances(ctx, variablePools)

  const [token0Balances, token1Balances, totalSupplies] = await Promise.all([
    multicall({
      ctx,
      calls: stablePools.map((pool) => ({ target: (pool as Contract).pool!, params: [0n] }) as const),
      abi: abi.balances,
    }),
    multicall({
      ctx,
      calls: stablePools.map((pool) => ({ target: (pool as Contract).pool!, params: [1n] }) as const),
      abi: abi.balances,
    }),
    multicall({
      ctx,
      calls: stablePools.map((pool) => ({ target: pool.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  const stablePoolsBalances: any[] = mapMultiSuccessFilter(
    token0Balances.map((_, i) => [token0Balances[i], token1Balances[i], totalSupplies[i]]),

    (res, index) => {
      const pool = stablePools[index]
      const rewards = pool.rewards as Contract[]
      const underlyings = pool.underlyings as Contract[]
      const [{ output: token0Balance }, { output: token1Balance }, { output: totalSupply }] =
        res.inputOutputPairs as OutputResponse[]

      underlyings.forEach((underlying, idx) => {
        const tokensBalances = [token0Balance, token1Balance]
        underlying.amount = (pool.amount * tokensBalances[idx]) / totalSupply
      })

      return {
        ...pool,
        amount: pool.amount,
        underlyings,
        rewards,
        category: 'farm' as Category,
      }
    },
  )

  return [...variablesPoolsBalances, ...stablePoolsBalances]
}

export async function getARBSPendingRewards(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: abi.pendingARBS,
  })

  return mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)

    return [{ ...reward, amount: res.output }]
  })
}
