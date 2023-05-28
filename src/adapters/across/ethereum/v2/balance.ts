import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
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

export async function getAcrossV2LPBalances(
  ctx: BalancesContext,
  pools: Contract[],
  manager: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesOfsRes, totalSuppliesRes, underlyingsBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address })),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: manager.address, params: [(pool.underlyings![0] as Contract).address] } as const),
      ),
      abi: abi.pooledTokens,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlying = pool.underlyings?.[0] as Contract
    const userBalanceOfRes = userBalancesOfsRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const underlyingsBalanceRes = underlyingsBalancesRes[poolIdx]

    if (
      !underlying ||
      !userBalanceOfRes.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n ||
      !underlyingsBalanceRes.success
    ) {
      continue
    }

    const [_lpToken, _isEnabled, _lastLpFeeUpdate, utilizedReserves, liquidReserves] = underlyingsBalanceRes.output

    const fmtUnderlyings = {
      ...underlying,
      amount: (userBalanceOfRes.output * (liquidReserves + utilizedReserves)) / totalSupplyRes.output,
    }

    balances.push({
      ...pool,
      amount: userBalanceOfRes.output,
      underlyings: [fmtUnderlyings],
      rewards: undefined,
      category: 'lp',
    })
  }

  return balances
}

export async function getAcrossV2FarmBalances(
  ctx: BalancesContext,
  pools: Contract[],
  farmer: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []
  const calls: Call<typeof abi.getUserStake>[] = pools.map((pool) => ({
    target: farmer.address,
    params: [pool.address, ctx.address],
  }))

  const [userBalancesOfsRes, userPendingsRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getUserStake }),
    multicall({ ctx, calls, abi: abi.getOutstandingRewards }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlying = pool.underlyings?.[0] as Contract
    const userBalanceOfRes = userBalancesOfsRes[poolIdx]
    const userPendingRewardRes = userPendingsRewardsRes[poolIdx]

    if (!underlying || !userBalanceOfRes.success || !userPendingRewardRes.success) {
      continue
    }

    balances.push({
      ...underlying,
      amount: userBalanceOfRes.output.cumulativeBalance,
      underlyings: undefined,
      rewards: [{ ...ACX, amount: userPendingRewardRes.output }],
      category: 'farm',
    })
  }
  return balances
}
