import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
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
} as const

export async function getMagpiePools(ctx: BaseContext, masterChef: Contract) {
  const poolsMagpie = await getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getPoolInfos: (ctx, { masterChefAddress, poolLength }) => {
      return getPoolInfos(ctx, { masterChefAddress, poolLength })
    },
  }).then((pools) => pools.map((pool) => ({ ...pool, rewards: masterChef.rewards })))

  return await getExtraPropsMagpie(ctx, poolsMagpie, masterChef.address)
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

  const [bonusRewardsTokensRes, underlyingsTokensRes, lpTokensRes] = await Promise.all([
    multicall({ ctx, calls: fmtPools.map((pool) => ({ target: pool.rewarder })), abi: abi.rewardTokenInfos }),
    multicall({ ctx, calls: fmtPools.map((pool) => ({ target: pool.helper })), abi: abi.depositToken }),
    multicall({ ctx, calls: fmtPools.map((pool) => ({ target: pool.helper })), abi: abi.lpToken }),
  ])

  return mapMultiSuccessFilter(
    underlyingsTokensRes.map((_, i) => [underlyingsTokensRes[i], bonusRewardsTokensRes[i], lpTokensRes[i]]),

    (res, index) => {
      const pool = fmtPools[index]

      const [{ output: underlyingsTokens }, { output: bonusRewardsTokens }, { output: lpToken }] = res.inputOutputPairs
      const [bonusTokenAddresses] = bonusRewardsTokens

      // MGP can also appears as an extraReward
      const noDuplicateRewards = bonusTokenAddresses.filter(
        (res: string) => res.toLowerCase() !== (pool.rewards?.[0] as string).toLowerCase(),
      )

      return {
        ...pool,
        token: lpToken,
        underlyings: underlyingsTokens ? [underlyingsTokens] : [pool.address],
        rewards: [...(pool.rewards as `0x${string}`[]), ...noDuplicateRewards],
      }
    },
  )
}
