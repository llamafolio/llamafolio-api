import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  token: {
    inputs: [],
    name: 'TOKEN',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'earned',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const PEARL: Token = {
  chain: 'polygon',
  address: '0x7238390d5f6f64e67c3211c343a410e2a3dec142',
  symbol: 'PEARL',
  decimals: 18,
}

export async function getPearlFarmContracts(ctx: BaseContext, farmers: `0x${string}`[]): Promise<Contract[]> {
  const pools: Contract[] = []

  const [tokensRes, rewardsTokensRes] = await Promise.all([
    multicall({ ctx, calls: farmers.map((farmer) => ({ target: farmer }) as const), abi: abi.token }),
    multicall({ ctx, calls: farmers.map((farmer) => ({ target: farmer }) as const), abi: abi.rewardToken }),
  ])

  for (let farmerIdx = 0; farmerIdx < farmers.length; farmerIdx++) {
    const farmer = farmers[farmerIdx]
    const tokenRes = tokensRes[farmerIdx]
    const rewardsTokenRes = rewardsTokensRes[farmerIdx]

    if (!tokenRes.success || !rewardsTokenRes.success) {
      continue
    }

    pools.push({
      chain: ctx.chain,
      address: tokenRes.output,
      underlyings: undefined,
      rewards: [rewardsTokenRes.output],
      farmer,
    })
  }

  return getPairsDetails(ctx, pools)
}

export async function getPearlFarmBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.farmer, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.farmer, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const userBalanceRes = userBalancesRes[poolIdx]
    const pendingRewardRes = pendingRewardsRes[poolIdx]

    if (!userBalanceRes.success || !pendingRewardRes.success) {
      continue
    }

    balances.push({
      ...pool,
      amount: userBalanceRes.output,
      underlyings: pool.underlyings as Contract[],
      rewards: [{ ...PEARL, amount: pendingRewardRes.output }],
      category: 'farm',
    })
  }

  return getUnderlyingBalances(ctx, balances)
}
