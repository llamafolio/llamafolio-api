import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import type { Pair } from '@lib/uniswap/v2/factory'
import { BigNumber } from 'ethers'

const abi = {
  pendingWETH: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingWETH',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const WETH: Token = {
  chain: 'arbitrum',
  address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  decimals: 18,
  symbol: 'WETH',
}

const ARX: Token = {
  chain: 'arbitrum',
  address: '0xD5954c3084a1cCd70B4dA011E67760B8e78aeE84',
  decimals: 18,
  symbol: 'ARX',
}

export const getArxMasterChefPoolsBalances = async (
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
  rewardToken: Token,
  rewardTokenName?: string,
  lpTokenAbi?: boolean,
): Promise<Balance[]> => {
  const [poolBalances, extraRewardsRes] = await Promise.all([
    getMasterChefPoolsBalances(ctx, pairs, masterchef, rewardToken, rewardTokenName, lpTokenAbi),
    multicall({
      ctx,
      calls: pairs.map((pair) => ({ target: masterchef.address, params: [pair.pid, ctx.address] })),
      abi: abi.pendingWETH,
    }),
  ])

  return poolBalances.map((poolBalance, idx) => {
    const extraRewardRes = extraRewardsRes[idx]

    if (isSuccess(extraRewardRes)) {
      poolBalance.rewards?.push({ ...WETH, amount: BigNumber.from(extraRewardRes.output) })
    }

    return poolBalance
  })
}

export async function getStakerBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }))

  const [userInfosRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingReward }),
  ])

  for (let stakerIdx = 0; stakerIdx < stakers.length; stakerIdx++) {
    const staker = stakers[stakerIdx]
    const reward = staker.rewards?.[0] as Contract
    const userInfoRes = userInfosRes[stakerIdx]
    const pendingRewardRes = pendingRewardsRes[stakerIdx]

    if (!reward || !isSuccess(userInfoRes) || !isSuccess(pendingRewardRes)) {
      continue
    }

    balances.push({
      ...staker,
      amount: BigNumber.from(userInfoRes.output.amount),
      underlyings: [ARX],
      rewards: [{ ...reward, amount: BigNumber.from(pendingRewardRes.output) }],
      category: 'stake',
    })
  }

  return balances
}
