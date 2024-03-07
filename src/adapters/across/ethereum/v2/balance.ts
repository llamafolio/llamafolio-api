import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import {
  getMasterChefPoolsBalances,
  type GetResolvedUnderlyingsParams,
  type GetUserBalanceParams,
  type GetUsersInfosParams,
} from '@lib/masterchef/masterChefBalance'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

const abi = {
  pooledTokens: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'pooledTokens',
    outputs: [
      { internalType: 'address', name: 'lpToken', type: 'address' },
      { internalType: 'bool', name: 'isEnabled', type: 'bool' },
      { internalType: 'uint32', name: 'lastLpFeeUpdate', type: 'uint32' },
      { internalType: 'int256', name: 'utilizedReserves', type: 'int256' },
      { internalType: 'uint256', name: 'liquidReserves', type: 'uint256' },
      { internalType: 'uint256', name: 'undistributedLpFees', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getUserStake: {
    inputs: [
      { internalType: 'address', name: 'stakedToken', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getUserStake',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'cumulativeBalance', type: 'uint256' },
          { internalType: 'uint256', name: 'averageDepositTime', type: 'uint256' },
          { internalType: 'uint256', name: 'rewardsAccumulatedPerToken', type: 'uint256' },
          { internalType: 'uint256', name: 'rewardsOutstanding', type: 'uint256' },
        ],
        internalType: 'struct AcceleratingDistributor.UserDeposit',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getOutstandingRewards: {
    inputs: [
      { internalType: 'address', name: 'stakedToken', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getOutstandingRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const manager: Contract = {
  chain: 'ethereum',
  address: '0xc186fA914353c44b2E33eBE05f21846F1048bEda',
}

const ACX: Token = {
  chain: 'ethereum',
  address: '0x44108f0223A3C3028F5Fe7AEC7f9bb2E66beF82F',
  decimals: 18,
  symbol: 'ACX',
}

export async function getAcrossBalances(ctx: BalancesContext, pools: Contract[], masterChef: Contract) {
  return Promise.all([getAcrossLPBalances(ctx, pools), getAcrossFarmBalances(ctx, pools, masterChef)])
}

async function getAcrossLPBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalancesOfsRes, totalSuppliesRes, underlyingsBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map(({ address }) => ({ target: address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map(({ address }) => ({ target: address })),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: manager.address, params: [(pool.underlyings![0] as Contract).address] }) as const,
      ),
      abi: abi.pooledTokens,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalancesOfsRes.map((_, i) => [userBalancesOfsRes[i], totalSuppliesRes[i], underlyingsBalancesRes[i]]),

    (res, index) => {
      const pool = pools[index]

      const [{ output: userBalance }, { output: totalSupply }, { output: tokenBalance }] = res.inputOutputPairs
      const [_lpToken, _isEnabled, _lastLpFeeUpdate, utilizedReserves, liquidReserves] = tokenBalance

      let underlying = pool.underlyings?.[0] as Contract
      underlying = { ...underlying, amount: (userBalance * (utilizedReserves + liquidReserves)) / totalSupply }

      return {
        ...pool,
        amount: userBalance,
        underlyings: [underlying],
        rewards: undefined,
        category: 'lp',
      }
    },
  )
}

async function getAcrossUnderlyingsBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [totalSuppliesRes, underlyingsBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map(({ address }) => ({ target: address })),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: manager.address, params: [(pool.underlyings![0] as Contract).address] }) as const,
      ),
      abi: abi.pooledTokens,
    }),
  ])

  return mapMultiSuccessFilter(
    totalSuppliesRes.map((_, i) => [totalSuppliesRes[i], underlyingsBalancesRes[i]]),

    (res, index) => {
      const pool = pools[index]
      const amount = pool.amount
      const rawUnderlying = pool.underlyings?.[0] as Contract
      const reward = pool.rewards?.[0] as Contract

      const [{ output: totalSupply }, { output: tokenBalance }] = res.inputOutputPairs
      const [_lpToken, _isEnabled, _lastLpFeeUpdate, utilizedReserves, liquidReserves] = tokenBalance

      if (!rawUnderlying || totalSupply === 0n) return null
      const underlyings = [{ ...rawUnderlying, amount: (amount * (utilizedReserves + liquidReserves)) / totalSupply }]

      return {
        ...pool,
        amount,
        underlyings,
        rewards: [reward],
        category: 'lp',
      }
    },
  ).filter(isNotNullish)
}

async function getAcrossFarmBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterChef: Contract,
): Promise<Balance[]> {
  return await getMasterChefPoolsBalances(ctx, pools, {
    masterChefAddress: masterChef.address,
    rewardToken: ACX,
    getUserBalance,
    getUserInfos,
    getUserPendingRewards,
    getResolvedUnderlyings,
  })
}

function getUserBalance({ userBalance }: GetUserBalanceParams) {
  return userBalance.cumulativeBalance
}

async function getUserInfos(ctx: BalancesContext, { masterChefAddress, pools, getUserBalance }: GetUsersInfosParams) {
  const poolsInfos = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.address, ctx.address] }) as const),
    abi: abi.getUserStake,
  })

  return mapSuccessFilter(poolsInfos, (res: any, index) => {
    const pool = pools[index]
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Contract[]
    const userBalance = getUserBalance!({ userBalance: res.output })

    return {
      ...pool,
      amount: userBalance,
      underlyings,
      rewards,
      category: 'farm',
    }
  })
}

async function getUserPendingRewards(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.address, ctx.address] }) as const),
    abi: abi.getOutstandingRewards,
  })

  return mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)
    return [{ ...reward, amount: res.output }]
  })
}

async function getResolvedUnderlyings(
  ctx: BalancesContext,
  { pools }: GetResolvedUnderlyingsParams,
): Promise<Contract[]> {
  return getAcrossUnderlyingsBalances(ctx, pools)
}
