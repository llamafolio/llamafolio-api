import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isNotNullish, isSuccess } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber, ethers } from 'ethers'
import { range } from 'lodash'

const abi = {
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
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accSushiPerShare', type: 'uint256' },
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
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingSushi: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingSushi',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  lpToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lpToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewarder: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewarder',
    outputs: [{ internalType: 'contract IRewarder', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingToken: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingToken',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getContractsFromMasterchefV2(
  ctx: BalancesContext,
  pairs: Contract[],
  masterchef: Contract,
): Promise<Contract[]> {
  const pools: Contract[] = []

  const { output: poolLengthRes } = await call({ ctx, target: masterchef.address, params: [], abi: abi.poolLength })

  const calls: Call[] = range(0, poolLengthRes).map((idx) => ({ target: masterchef.address, params: [idx] }))

  const [poolInfosRes, rewardersRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.lpToken }),
    multicall({ ctx, calls, abi: abi.rewarder }),
  ])

  for (let poolIdx = 0; poolIdx < poolInfosRes.length; poolIdx++) {
    const poolInfoRes = poolInfosRes[poolIdx]
    const rewarderRes = rewardersRes[poolIdx]
    if (!isSuccess(poolInfoRes)) {
      continue
    }

    pools.push({
      chain: ctx.chain,
      address: poolInfoRes.output,
      lpToken: poolInfoRes.output,
      rewarder: isSuccess(rewarderRes) ? rewarderRes.output : undefined,
      pid: poolInfoRes.input.params[0],
    })
  }

  const pairByAddress: { [key: string]: Contract } = {}
  for (const pair of pairs) {
    pairByAddress[pair.address.toLowerCase()] = pair
  }

  const masterchefPools = pools
    .map((pool) => {
      const pair = pairByAddress[pool.lpToken.toLowerCase()]

      if (!pair) {
        return null
      }

      const contract: Contract = { ...pair, pid: pool.pid, rewarder: pool.rewarder, category: 'farm' }
      return contract
    })
    .filter(isNotNullish)

  return masterchefPools
}

export async function getBalancesFromMasterchefV2(
  ctx: BalancesContext,
  pairs: Contract[],
  masterchef: Contract,
  rewardToken: Token,
): Promise<Balance[]> {
  const poolsBalances: Balance[] = []

  const pools = await getContractsFromMasterchefV2(ctx, pairs, masterchef)

  const calls: Call[] = pools.map((pool) => ({ target: masterchef.address, params: [pool.pid, ctx.address] }))

  const [poolsBalancesRes, pendingSushisRes, pendingTokensRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingSushi }),
    multicall({
      ctx,
      calls: pools.map((pool) =>
        pool.rewarder && pool.rewarder !== ethers.constants.AddressZero
          ? { target: pool.rewarder, params: [pool.pid, ctx.address] }
          : null,
      ),
      abi: abi.pendingToken,
    }),
  ])

  for (let userIdx = 0; userIdx < poolsBalancesRes.length; userIdx++) {
    const pool = pools[userIdx]
    const underlying = pool.underlyings?.[0] as Contract
    const poolBalanceRes = poolsBalancesRes[userIdx]
    const pendingSushiRes = pendingSushisRes[userIdx]
    const pendingTokenRes = pendingTokensRes[userIdx]

    if (!isSuccess(poolBalanceRes) || !isSuccess(pendingSushiRes)) {
      continue
    }

    poolsBalances.push({
      ...pool,
      underlyings: pool.underlyings as Contract[],
      category: 'farm',
      amount: BigNumber.from(poolBalanceRes.output.amount),
      rewards: [
        { ...rewardToken, amount: BigNumber.from(pendingSushiRes.output) },
        { ...underlying, amount: isSuccess(pendingTokenRes) ? BigNumber.from(pendingTokenRes.output) : BN_ZERO },
      ],
    })
  }

  return getUnderlyingBalances(ctx, poolsBalances)
}
