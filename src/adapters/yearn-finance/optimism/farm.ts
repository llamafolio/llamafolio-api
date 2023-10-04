import { adjustUnderlyingAmounts } from '@adapters/yearn-finance/common/balance'
import { mergeContracts } from '@adapters/yearn-finance/common/vault'
import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

type IYearnBalances = Balance & {
  exchangeRate: bigint
  lpToken: `0x${string}`
}

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

const OP: Token = {
  chain: 'optimism',
  address: '0x4200000000000000000000000000000000000042',
  decimals: 18,
  symbol: 'OP',
}

export async function getOptimisticYearnFarmContracts(ctx: BaseContext, registry: Contract): Promise<Contract[]> {
  const pools: Contract[] = []

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

  for (let index = 0; index < poolLength; index++) {
    const poolsAddressRes = poolsAddressesRes[index]
    const stakingPoolRes = stakingPoolsRes[index]
    const lpTokenRes = lpTokensRes[index]

    if (!poolsAddressRes.success || !stakingPoolRes.success || !lpTokenRes.success) {
      continue
    }

    pools.push({
      chain: ctx.chain,
      address: lpTokenRes.output,
      pool: poolsAddressRes.output,
      lpToken: lpTokenRes.output,
      gauge: stakingPoolRes.output,
    })
  }

  const fmtPools = await getPairsDetails(ctx, pools)
  mergeContracts(pools, fmtPools)

  return pools.map((pool) => ({ ...pool, address: pool.pool }))
}

export async function getYearnFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances: IYearnBalances[] = []

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
      calls: farmers.map((farmer) => ({ target: farmer.pool }) as const),
      abi: abi.pricePerShare,
    }),
  ])

  for (const [index, farmer] of farmers.entries()) {
    const userBalanceRes = userBalancesRes[index]
    const userRewardRes = userRewardsRes[index]
    const exchangeRateRes = exchangeRatesRes[index]

    if (!userBalanceRes.success || !userRewardRes.success || !exchangeRateRes.success) {
      continue
    }

    balances.push({
      ...farmer,
      address: farmer.lpToken,
      lpToken: farmer.lpToken,
      amount: userBalanceRes.output,
      underlyings: farmer.underlyings as Contract[],
      exchangeRate: exchangeRateRes.output,
      rewards: [{ ...OP, amount: userRewardRes.output }],
      category: 'farm',
    })
  }

  const fmtBalances = await getUnderlyingBalances(ctx, balances)
  mergeContracts(balances, fmtBalances)
  adjustUnderlyingAmounts(balances)

  return balances
}
