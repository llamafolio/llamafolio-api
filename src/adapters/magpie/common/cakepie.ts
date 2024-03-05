import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { getMasterChefPoolsBalances, type GetUsersInfosParams } from '@lib/masterchef/masterChefBalance'
import { getMasterChefPoolsContracts, type GetPoolsInfosParams } from '@lib/masterchef/masterChefContract'
import { multicall } from '@lib/multicall'

const abi = {
  registeredToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'registeredToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenToPoolInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'tokenToPoolInfo',
    outputs: [
      { internalType: 'address', name: 'stakingToken', type: 'address' },
      { internalType: 'address', name: 'receiptToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'accCakepiePerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'totalStaked', type: 'uint256' },
      { internalType: 'address', name: 'rewarder', type: 'address' },
      { internalType: 'bool', name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  stakingInfo: {
    inputs: [
      { internalType: 'address', name: '_stakingToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'stakingInfo',
    outputs: [
      { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'availableAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingTokens: {
    inputs: [
      { internalType: 'address', name: '_stakingToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'address', name: '_rewardToken', type: 'address' },
    ],
    name: 'pendingTokens',
    outputs: [
      { internalType: 'uint256', name: 'pendingCakepie', type: 'uint256' },
      { internalType: 'address', name: 'bonusTokenAddress', type: 'address' },
      { internalType: 'string', name: 'bonusTokenSymbol', type: 'string' },
      { internalType: 'uint256', name: 'pendingBonusToken', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const CKP: Contract = {
  chain: 'bsc',
  address: '0x2B5D9ADea07B590b638FFc165792b2C610EdA649',
  decimals: 18,
  symbol: 'CKP',
}

export async function getCakepiePools(ctx: BaseContext, masterChef: Contract): Promise<Contract[]> {
  const cakepiePools = await getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getPoolInfos: getCakepiePoolInfos,
  })

  return cakepiePools.map((pool) => ({ ...pool, rewards: ['0x2B5D9ADea07B590b638FFc165792b2C610EdA649'] }))
}

async function getCakepiePoolInfos(ctx: BaseContext, { masterChefAddress, poolLength }: GetPoolsInfosParams) {
  const poolsAddressesRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((i) => ({ target: masterChefAddress, params: [i] }) as const),
    abi: abi.registeredToken,
  })

  const poolInfos = await multicall({
    ctx,
    calls: mapSuccessFilter(poolsAddressesRes, (res) => ({ target: masterChefAddress, params: [res.output] }) as const),
    abi: abi.tokenToPoolInfo,
  })

  return mapSuccessFilter(poolInfos, (res) => {
    return { chain: ctx.chain, address: res.output[0], pid: res.input.params![0] }
  })
}

export async function getCakepieBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterChef: Contract,
): Promise<Balance[]> {
  return getMasterChefPoolsBalances(ctx, pools, {
    masterChefAddress: masterChef.address,
    rewardToken: CKP,
    getUserInfos: getCakepieUserInfos,
    getUserPendingRewards: getCakepieUserPendingRewards,
  })
}

export async function getCakepieUserInfos(
  ctx: BalancesContext,
  { masterChefAddress, pools, getUserBalance }: GetUsersInfosParams,
) {
  const poolsInfos = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: abi.stakingInfo,
  })

  return mapSuccessFilter(poolsInfos, (res: any, index) => {
    const pool = pools[index]
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Contract[]
    const userBalance = Array.isArray(res.output) ? getUserBalance!({ userBalance: res.output }) : res.output

    return {
      ...pool,
      amount: userBalance,
      underlyings,
      rewards,
      category: 'farm',
    }
  })
}

export async function getCakepieUserPendingRewards(
  ctx: BalancesContext,
  { masterChefAddress, pools, rewardToken }: GetUsersInfosParams,
) {
  const userPendingRewards = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address, CKP.address] }) as const),
    abi: abi.pendingTokens,
  })

  return mapSuccessFilter(userPendingRewards, (res: any, index) => {
    const pool = pools[index]
    const reward = rewardToken || (pool.rewards?.[0] as Contract)

    return [{ ...reward, amount: res.output[0] }]
  })
}
