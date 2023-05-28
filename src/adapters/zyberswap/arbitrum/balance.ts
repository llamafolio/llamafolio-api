import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import type { Pair } from '@lib/uniswap/v2/factory'
import { BigNumber } from 'ethers'

const abi = {
  pendingTokens: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingTokens',
    outputs: [
      { internalType: 'address[]', name: 'addresses', type: 'address[]' },
      { internalType: 'string[]', name: 'symbols', type: 'string[]' },
      { internalType: 'uint256[]', name: 'decimals', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardLockedUp', type: 'uint256' },
      { internalType: 'uint256', name: 'nextHarvestUntil', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getTokenBalances: {
    inputs: [],
    name: 'getTokenBalances',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const zyber: Token = {
  chain: 'arbitrum',
  address: '0x3b475f6f2f41853706afc9fa6a6b8c5df1a2724c',
  decimals: 18,
  symbol: 'ZYB',
}

export async function getZyberFarmBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
  rewardToken: Token,
  rewardTokenName?: string,
  lpTokenAbi?: boolean,
): Promise<Balance[]> {
  const pairBalances = await getMasterChefPoolsBalances(
    ctx,
    pairs,
    masterchef,
    rewardToken,
    rewardTokenName,
    lpTokenAbi,
  )

  const calls: Call<typeof abi.pendingTokens>[] = pairBalances.map((pair) => ({
    target: masterchef.address,
    params: [(pair as Contract).pid, ctx.address],
  }))

  const pendingRewardsRes = await multicall({ ctx, calls, abi: abi.pendingTokens })

  pairBalances.forEach((pair, idx) => {
    const pendingRewardRes = pendingRewardsRes[idx]
    if (pendingRewardRes.success) {
      const [_addresses, _symbols, _decimals, amounts] = pendingRewardRes.output
      pair.rewards = [{ ...zyber, amount: BigNumber.from(amounts[0]) }]
    }
  })

  return pairBalances
}

export async function getZyberFarm3poolsBalances(
  ctx: BalancesContext,
  pool: Contract,
  masterchef: Contract,
): Promise<Balance | undefined> {
  const [userInfo, pendingRewardsRes, underlyingsBalancesRes, totalSupplyRes] = await Promise.all([
    call({ ctx, target: masterchef.address, params: [pool.pid, ctx.address], abi: abi.userInfo }),
    call({ ctx, target: masterchef.address, params: [pool.pid, ctx.address], abi: abi.pendingTokens }),
    call({ ctx, target: pool.address, abi: abi.getTokenBalances }),
    call({ ctx, target: pool.lpToken, abi: erc20Abi.totalSupply }),
  ])
  const [amount] = userInfo
  const [_addresses, _symbols, _decimals, pendRewardAmounts] = pendingRewardsRes

  let underlyings = pool.underlyings
  let rewards = pool.rewards

  if (!underlyings || !rewards) {
    return
  }

  underlyings = underlyings.map((underlying, idx) => ({
    ...(underlying as Contract),
    amount: BigNumber.from(amount).mul(underlyingsBalancesRes[idx]).div(totalSupplyRes),
  }))

  rewards = rewards.map((reward, idx) => ({
    ...(reward as Balance),
    amount: BigNumber.from(pendRewardAmounts[idx]),
  }))

  return {
    ...pool,
    amount: BigNumber.from(amount),
    underlyings,
    rewards: rewards as Balance[],
    category: 'farm',
  }
}
