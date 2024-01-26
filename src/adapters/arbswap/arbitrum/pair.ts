import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  pairLength: {
    inputs: [],
    name: 'pairLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  swapPairContract: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'swapPairContract',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
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
} as const

interface OutputResponse {
  output: bigint
}

export async function getStablePairsContracts(ctx: BaseContext, factoryAddress: `0x${string}`): Promise<Contract[]> {
  const pairLength = await call({ ctx, target: factoryAddress, abi: abi.pairLength })

  const poolAddresses = await multicall({
    ctx,
    calls: rangeBI(0n, pairLength).map((i) => ({ target: factoryAddress, params: [i] }) as const),
    abi: abi.swapPairContract,
  })

  const [tokens, tokens0InPairs, tokens1InPairs] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(poolAddresses, (res) => ({ target: res.output }) as const),
      abi: abi.token,
    }),
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

  return mapMultiSuccessFilter(
    poolAddresses.map((_, i) => [poolAddresses[i], tokens[i], tokens0InPairs[i], tokens1InPairs[i]]),

    (res) => {
      const [{ output: pool }, { output: token }, { output: token0 }, { output: token1 }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address: token,
        pool,
        underlyings: [token0, token1],
      }
    },
  )
}

export async function getStablePairsBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalances, token0Balances, token1Balances, totalSupplies] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.pool!, params: [0n] }) as const),
      abi: abi.balances,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.pool!, params: [1n] }) as const),
      abi: abi.balances,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], token0Balances[i], token1Balances[i], totalSupplies[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlyings = pool.underlyings as Contract[]
      const [{ output: amount }, { output: token0Balance }, { output: token1Balance }, { output: totalSupply }] =
        res.inputOutputPairs as OutputResponse[]

      underlyings.forEach((underlying, idx) => {
        const tokensBalances = [token0Balance, token1Balance]
        underlying.amount = (amount * tokensBalances[idx]) / totalSupply
      })

      return {
        ...pool,
        amount,
        underlyings,
        rewards: undefined,
        category: 'lp',
      }
    },
  )
}
