import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
import type { Category } from '@lib/category'
import { getERC20Details } from '@lib/erc20'
import { getMasterChefPoolsContracts, type GetPoolsInfosParams } from '@lib/masterchef/newMasterchef'
import { multicall } from '@lib/multicall'

const abi = {
  registeredToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'registeredToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenToPoolInfo_magpie: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'tokenToPoolInfo',
    outputs: [
      { internalType: 'address', name: 'stakingToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'accMGPPerShare', type: 'uint256' },
      { internalType: 'address', name: 'rewarder', type: 'address' },
      { internalType: 'address', name: 'helper', type: 'address' },
      { internalType: 'bool', name: 'helperNeedsHarvest', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokenInfos: {
    inputs: [],
    name: 'rewardTokenInfos',
    outputs: [
      { internalType: 'address[]', name: 'bonusTokenAddresses', type: 'address[]' },
      { internalType: 'string[]', name: 'bonusTokenSymbols', type: 'string[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  depositToken: {
    inputs: [],
    name: 'depositToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  lpToken: {
    inputs: [],
    name: 'lpToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
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
  allPendingTokens: {
    inputs: [
      { internalType: 'address', name: '_stakingToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'allPendingTokens',
    outputs: [
      { internalType: 'uint256', name: 'pendingMGP', type: 'uint256' },
      { internalType: 'address[]', name: 'bonusTokenAddresses', type: 'address[]' },
      { internalType: 'string[]', name: 'bonusTokenSymbols', type: 'string[]' },
      { internalType: 'uint256[]', name: 'pendingBonusRewards', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getReserves: {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint256', name: 'rdnt', type: 'uint256' },
      { internalType: 'uint256', name: 'weth', type: 'uint256' },
      { internalType: 'uint256', name: 'lpTokenSupply', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMagpiePools(ctx: BaseContext, masterChef: Contract, basePools: Contract[]) {
  const poolsMagpie = await getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getPoolInfos: (ctx, { masterChefAddress, poolLength }) => {
      return getPoolInfos(ctx, { masterChefAddress, poolLength })
    },
  }).then((pools) => pools.map((pool) => ({ ...pool, rewards: masterChef.rewards })))

  const fmtMagpiePools = await getExtraPropsMagpie(ctx, poolsMagpie, masterChef.address)

  return {
    masterChefMagpieWithPools: await getAttachMagpiePoolsToMasterChef(ctx, fmtMagpiePools, basePools, masterChef),
    magpiePools: fmtMagpiePools,
  }
}

async function getPoolInfos(ctx: BaseContext, { masterChefAddress, poolLength }: GetPoolsInfosParams) {
  const poolsAddressesRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((i) => ({ target: masterChefAddress, params: [i] }) as const),
    abi: abi.registeredToken,
  })

  return multicall({
    ctx,
    calls: mapSuccessFilter(poolsAddressesRes, (res) => ({ target: masterChefAddress, params: [res.output] }) as const),
    abi: abi.tokenToPoolInfo_magpie,
  })
}

async function getExtraPropsMagpie(
  ctx: BaseContext,
  pools: Contract[],
  masterChefAddress: `0x${string}`,
): Promise<Contract[]> {
  const poolsExtraInfosRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.address] }) as const),
    abi: abi.tokenToPoolInfo_magpie,
  })

  const fmtPools: Contract[] = mapSuccessFilter(poolsExtraInfosRes, (res, index) => {
    const [_, __, ___, ____, rewarder, helper] = res.output as any

    return { ...pools[index], rewarder, helper }
  })

  const [bonusRewardsTokensRes, depositTokenRes, lpTokensRes] = await Promise.all([
    multicall({ ctx, calls: fmtPools.map((pool) => ({ target: pool.rewarder })), abi: abi.rewardTokenInfos }),
    multicall({ ctx, calls: fmtPools.map((pool) => ({ target: pool.helper })), abi: abi.depositToken }),
    multicall({ ctx, calls: fmtPools.map((pool) => ({ target: pool.helper })), abi: abi.lpToken }),
  ])

  return mapMultiSuccessFilter(
    depositTokenRes.map((_, i) => [depositTokenRes[i], bonusRewardsTokensRes[i], lpTokensRes[i]]),

    (res, index) => {
      const pool = fmtPools[index]

      const [{ output: depositToken }, { output: bonusRewardsTokens }, { output: lpToken }] = res.inputOutputPairs
      const [bonusTokenAddresses] = bonusRewardsTokens

      // MGP can also appears as an extraReward
      const noDuplicateRewards = bonusTokenAddresses.filter(
        (res: string) => res.toLowerCase() !== (pool.rewards?.[0] as string).toLowerCase(),
      )

      return {
        ...pool,
        address: lpToken,
        decimals: 18,
        token: depositToken,
        rewards: [...(pool.rewards as `0x${string}`[]), ...noDuplicateRewards],
      }
    },
  )
}

async function getAttachMagpiePoolsToMasterChef(
  ctx: BaseContext,
  pools: Contract[],
  basePools: Contract[],
  masterChef: Contract,
) {
  const processPoolDetails = async (pool: Contract) => {
    const [[{ address, symbol }], rewardsDetails] = await Promise.all([
      getERC20Details(ctx, [pool.token!]),
      getERC20Details(ctx, pool.rewards as `0x${string}`[]),
    ])

    return { ...pool, token: address, symbol, rewards: rewardsDetails }
  }

  const fmtPools = await Promise.all([...pools, ...basePools].map(processPoolDetails))

  return { ...masterChef, tokens: fmtPools as Contract[] }
}

export async function getMasterMagpieBalances(ctx: BalancesContext, masterChef: Contract): Promise<Balance[]> {
  const pools = masterChef.tokens as Contract[]

  const [userBalances, userPendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: masterChef.address, params: [pool.pid || pool.address, ctx.address] }) as const,
      ),
      abi: abi.stakingInfo,
    }),
    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: masterChef.address, params: [pool.pid || pool.address, ctx.address] }) as const,
      ),
      abi: abi.allPendingTokens,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], userPendingRewards[i]]),

    (res, index) => {
      const pool = pools[index]
      const rewards = pool.rewards as Balance[]
      const [{ output: userBalance }, { output: userRewards }] = res.inputOutputPairs

      const [stake] = userBalance
      const [baseReward, bonusTokenAddresses, _, pendingBonusRewards] = userRewards

      if (rewards.length > 0 && baseReward !== undefined) {
        rewards[0] = { ...rewards[0], amount: baseReward }
      }

      bonusTokenAddresses.forEach((bonusAddress: `0x${string}`, bonusIndex: number) => {
        const rewardIndex = rewards.findIndex(
          (reward, index) => index > 0 && reward.address.toLowerCase() === bonusAddress.toLowerCase(),
        )

        if (rewardIndex > 0 && pendingBonusRewards[bonusIndex] !== undefined) {
          rewards[rewardIndex] = { ...rewards[rewardIndex], amount: pendingBonusRewards[bonusIndex] }
        }
      })

      return {
        ...pool,
        amount: stake,
        underlyings: pool.underlyings as Contract[],
        rewards,
        category: 'farm' as Category,
        provider: pool.provider,
      }
    },
  )
}
