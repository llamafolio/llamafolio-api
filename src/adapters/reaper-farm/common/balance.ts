import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { parseEther } from 'viem'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type IReaperBalance = IBalancerBalance & {
  provider: string
}

export async function getReaperFarmBalances(ctx: BalancesContext, pools: Contract[], vault?: Contract) {
  const balancer: IReaperBalance[] = []
  const nonbalancer: Balance[] = []

  const [userBalancesRes, pricePerFullSharesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: abi.getPricePerFullShare,
    }),
  ])

  mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [userBalancesRes[i], pricePerFullSharesRes[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlyings = pool.underlyings as Contract[]
      const [{ output: userBalance }, { output: pricePerFullShareRes }] = res.inputOutputPairs

      if (userBalance === 0n) return null

      const balance: IReaperBalance = {
        ...pool,
        amount: (BigInt(userBalance) * BigInt(pricePerFullShareRes)) / parseEther('1.0'),
        underlyings,
        rewards: undefined,
        provider: pool.provider,
        poolId: pool.poolId,
        category: 'farm',
      }

      return pool.poolId ? balancer.push(balance) : nonbalancer.push(balance)
    },
  )

  return Promise.all([
    getUnderlyingsBalancesFromBalancer(ctx, balancer, vault, {
      getAddress: (balance: Balance) => balance.token!,
      getCategory: (balance: Balance) => balance.category,
    }),
    getUnderlyingBalances(ctx, nonbalancer, { getAddress: (balance) => balance.token! }),
  ])
}
