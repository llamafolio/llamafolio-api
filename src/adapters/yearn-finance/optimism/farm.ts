import { AdjustUnderlyingsAmount } from '@adapters/yearn-finance/common/balance'
import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  numTokens: {
    inputs: [],
    name: 'numTokens',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokens: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'tokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakingPool: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'stakingPool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    stateMutability: 'view',
    type: 'function',
    name: 'token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  pricePerShare: {
    stateMutability: 'view',
    type: 'function',
    name: 'pricePerShare',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
} as const

type PoolBalances = Balance & {
  pricePerFullShare: number
}

const OP: Token = {
  chain: 'optimism',
  address: '0x4200000000000000000000000000000000000042',
  decimals: 18,
  symbol: 'OP',
}

export async function getOptimisticYearnFarmContracts(ctx: BaseContext, registry: Contract): Promise<Contract[]> {
  const poolLength = await call({ ctx, target: registry.address, abi: abi.numTokens })

  const poolsAddressesRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((idx) => ({ target: registry.address, params: [idx] }) as const),
    abi: abi.tokens,
  })

  const [stakingPoolsRes, lpTokensRes] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(
        poolsAddressesRes,
        (res) => ({ target: registry.address, params: [res.output] }) as const,
      ),
      abi: abi.stakingPool,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(poolsAddressesRes, (res) => ({ target: res.output }) as const),
      abi: abi.token,
    }),
  ])

  const pools: Contract[] = mapMultiSuccessFilter(
    stakingPoolsRes.map((_, i) => [stakingPoolsRes[i], lpTokensRes[i]]),

    (res) => {
      const [{ output: gauge }, token] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address: token.input.target,
        gauge: gauge,
        token: token.output,
      }
    },
  )

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token! })
}

export async function getYearnFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, userRewardsRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.gauge, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.gauge, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address }) as const),
      abi: abi.pricePerShare,
    }),
  ])

  const pairBalances: PoolBalances[] = mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [userBalancesRes[i], userRewardsRes[i], exchangeRatesRes[i]]),

    (res, index) => {
      const farmer = farmers[index]
      const [{ output: userBalance }, { output: userReward }, { output: pricePerFullShareRes }] = res.inputOutputPairs

      const pricePerFullShare = parseFloatBI(pricePerFullShareRes!, farmer.decimals!)
      if (userBalance === 0n) return null

      return {
        ...farmer,
        amount: userBalance,
        underlyings: farmer.underlyings as Contract[],
        pricePerFullShare,
        rewards: [{ ...OP, amount: userReward }],
        category: 'farm' as Category,
      }
    },
  ).filter(isNotNullish)

  return AdjustUnderlyingsAmount(
    await getUnderlyingBalances(ctx, pairBalances, { getAddress: (contract) => contract.token! }),
  )
}
