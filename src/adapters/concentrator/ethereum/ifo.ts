import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  aladdinCRV: {
    inputs: [],
    name: 'aladdinCRV',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  ctr: {
    inputs: [],
    name: 'ctr',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getUserShare: {
    inputs: [
      {
        internalType: 'uint256',
        name: '_pid',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_account',
        type: 'address',
      },
    ],
    name: 'getUserShare',
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
  pendingCTR: {
    inputs: [
      {
        internalType: 'uint256',
        name: '_pid',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_account',
        type: 'address',
      },
    ],
    name: 'pendingCTR',
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
  pendingReward: {
    inputs: [
      {
        internalType: 'uint256',
        name: '_pid',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '_account',
        type: 'address',
      },
    ],
    name: 'pendingReward',
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
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [
      {
        internalType: 'uint256',
        name: 'pools',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'uint128', name: 'totalUnderlying', type: 'uint128' },
      { internalType: 'uint128', name: 'totalShare', type: 'uint128' },
      { internalType: 'uint256', name: 'accRewardPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'convexPoolId', type: 'uint256' },
      { internalType: 'address', name: 'lpToken', type: 'address' },
      { internalType: 'address', name: 'crvRewards', type: 'address' },
      {
        internalType: 'uint256',
        name: 'withdrawFeePercentage',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'platformFeePercentage',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'harvestBountyPercentage',
        type: 'uint256',
      },
      { internalType: 'bool', name: 'pauseDeposit', type: 'bool' },
      { internalType: 'bool', name: 'pauseWithdraw', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

interface PoolContract extends Contract {
  pid: number
  convexPoolId: number
  crvRewards: string
}

export async function getIFOPoolsContracts(ctx: BaseContext, concentratorIFOVault: Contract) {
  const contracts: PoolContract[] = []

  const [poolLengthRes, aladdinCRVRes, ctrRes] = await Promise.all([
    call({
      ctx,
      target: concentratorIFOVault.address,
      params: [],
      abi: abi.poolLength,
    }),
    call({
      ctx,
      target: concentratorIFOVault.address,
      params: [],
      abi: abi.aladdinCRV,
    }),
    call({
      ctx,
      target: concentratorIFOVault.address,
      params: [],
      abi: abi.ctr,
    }),
  ])

  const poolLength = parseInt(poolLengthRes.output)

  const poolsInfoRes = await multicall({
    ctx,
    calls: range(0, poolLength).map((idx) => ({
      target: concentratorIFOVault.address,
      params: [idx],
    })),
    abi: abi.poolInfo,
  })

  for (let pid = 0; pid < poolLength; pid++) {
    const poolInfoRes = poolsInfoRes[pid]
    if (!isSuccess(poolInfoRes)) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      pid,
      address: poolInfoRes.output.lpToken,
      convexPoolId: poolInfoRes.output.convexPoolId,
      crvRewards: poolInfoRes.output.crvRewards,
      rewards: [aladdinCRVRes.output, ctrRes.output],
    })
  }

  return contracts
}

export async function getIFOPoolsBalances(ctx: BalancesContext, pools: PoolContract[], concentratorIFOVault: Contract) {
  const balances: Balance[] = []

  const calls: Call[] = pools.map((pool) => ({
    target: concentratorIFOVault.address,
    params: [pool.pid, ctx.address],
  }))

  const [userSharesRes, pendingCTRsRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getUserShare }),
    multicall({ ctx, calls, abi: abi.pendingCTR }),
    multicall({ ctx, calls, abi: abi.pendingReward }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const userShareRes = userSharesRes[poolIdx]
    const pendingCTRRes = pendingCTRsRes[poolIdx]
    const pendingRewardRes = pendingRewardsRes[poolIdx]
    const rewards = pool.rewards

    if (!isSuccess(userShareRes)) {
      continue
    }

    const balance: Balance = {
      ...pool,
      amount: BigNumber.from(userShareRes.output),
      category: 'lp',
    }

    if (rewards) {
      balance.rewards = [
        {
          ...(rewards[0] as Contract),
          amount: pendingRewardRes.success ? BigNumber.from(pendingRewardRes.output) : BN_ZERO,
        },
        { ...(rewards[1] as Contract), amount: pendingCTRRes.success ? BigNumber.from(pendingCTRRes.output) : BN_ZERO },
      ]
    }

    balances.push(balance)
  }

  return balances
}
