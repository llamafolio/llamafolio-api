import { Balance, BaseContext, Contract, MethodWithAbi } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

export interface GetMasterChefPoolsInfoParams {
  chain: Chain
  masterChefAddress: string
  poolLengthMethod?: MethodWithAbi
  poolInfoMethod?: MethodWithAbi
}

const defaultMasterChefPoolLengthMethod: MethodWithAbi = {
  method: 'poolLength',
  abi: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const defaultMasterChefPoolInfoMethod: MethodWithAbi = {
  method: 'poolInfo',
  abi: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accSushiPerShare', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export const masterChefLpPoolInfoMethod: MethodWithAbi = {
  method: 'lpToken',
  abi: {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'lpToken',
    outputs: [
      {
        internalType: 'contract IBEP20',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getMasterChefPoolsInfo({
  chain,
  masterChefAddress,
  poolLengthMethod = defaultMasterChefPoolLengthMethod,
  poolInfoMethod = defaultMasterChefPoolInfoMethod,
}: GetMasterChefPoolsInfoParams) {
  const poolLength = await call({
    target: masterChefAddress,
    abi: poolLengthMethod.abi,
    params: [],
    chain,
  })

  const calls = []
  for (let i = 0; i < poolLength.output; i++) {
    calls.push({
      params: [i],
      target: masterChefAddress,
    })
  }

  const poolsInfoRes = await multicall({
    chain,
    calls,
    abi: poolInfoMethod.abi,
  })

  const poolsInfo = poolsInfoRes
    .filter((res) => res.success)
    .map((res) => {
      // Override poolsInfo data for lpToken
      if (poolInfoMethod.method === 'lpToken') {
        return { lpToken: res.output, pid: res.input.params[0] }
      } else {
        return { ...res.output, pid: res.input.params[0] }
      }
    })

  return poolsInfo
}

const defaultMasterChefUserInfoMethod: MethodWithAbi = {
  method: 'userInfo',
  abi: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export const masterChefPendingRewardsMethod = (methodName = 'pendingSushi'): MethodWithAbi => {
  return {
    method: methodName,
    abi: {
      inputs: [
        {
          internalType: 'uint256',
          name: '_pid',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: '_user',
          type: 'address',
        },
      ],
      name: methodName,
      outputs: [
        {
          internalType: 'uint256',
          name: 'pending',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  }
}

export interface GetMasterChefBalancesParams {
  chain: Chain
  masterChefAddress: string
  tokens: Contract[]
  userInfoMethod?: MethodWithAbi
  pendingRewardMethod?: MethodWithAbi
  rewardToken: Token
}

export async function getMasterChefBalances(
  ctx: BaseContext,
  {
    chain,
    masterChefAddress,
    tokens,
    userInfoMethod = defaultMasterChefUserInfoMethod,
    pendingRewardMethod = masterChefPendingRewardsMethod(),
    rewardToken,
  }: GetMasterChefBalancesParams,
) {
  const userInfoRes = await multicall({
    chain,
    calls: tokens.map((token) => ({
      params: [token.pid, ctx.address],
      target: masterChefAddress,
    })),
    abi: userInfoMethod.abi,
  })

  const resBalances: Balance[] = userInfoRes
    .filter((userInfo) => userInfo.success)
    .map((userInfo, i) => {
      return {
        ...(tokens[i] as Balance),
        category: 'farm',
        amount: BigNumber.from(userInfo.output.amount),
      }
    })

  const pendingRewardsRes = await multicall({
    chain,
    calls: tokens.map((token) => ({
      params: [token.pid, ctx.address],
      target: masterChefAddress,
    })),
    abi: pendingRewardMethod.abi,
  })

  pendingRewardsRes
    .filter((pendingRewards) => pendingRewards.success)
    .map((pendingRewards, i) => {
      const parent = resBalances[i]
      if (!parent.rewards) {
        parent.rewards = []
      }
      parent.rewards.push({
        ...rewardToken,
        category: 'reward',
        type: 'reward',
        amount: BigNumber.from(pendingRewards.output),
        claimable: BigNumber.from(pendingRewards.output),
      })
    })

  return resBalances
}
