import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

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

const ACX: Token = {
  chain: 'ethereum',
  address: '0x44108f0223A3C3028F5Fe7AEC7f9bb2E66beF82F',
  decimals: 18,
  symbol: 'ACX',
}

export async function getAcrossBalances(
  ctx: BalancesContext,
  pools: Contract[],
  manager: Contract,
  masterChef: Contract,
) {
  return Promise.all([getAcrossLPBalances(ctx, pools, manager), getAcrossFarmBalances(ctx, pools, masterChef)])
}

async function getAcrossLPBalances(ctx: BalancesContext, pools: Contract[], manager: Contract): Promise<Balance[]> {
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

async function getAcrossFarmBalances(ctx: BalancesContext, pools: Contract[], farmer: Contract): Promise<Balance[]> {
  const [userBalancesOfsRes, userPendingsRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: farmer.address, params: [pool.address, ctx.address] }) as const),
      abi: abi.getUserStake,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: farmer.address, params: [pool.address, ctx.address] }) as const),
      abi: abi.getOutstandingRewards,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalancesOfsRes.map((_, i) => [userBalancesOfsRes[i], userPendingsRewardsRes[i]]),

    (res, index) => {
      const pool = pools[index]
      const underlying = pool.underlyings?.[0] as Contract
      const [{ output: userBalance }, { output: pendingRewards }] = res.inputOutputPairs

      return {
        ...pool,
        amount: userBalance.cumulativeBalance,
        underlyings: [underlying],
        rewards: [{ ...ACX, amount: pendingRewards }],
        category: 'farm',
      }
    },
  )
}
