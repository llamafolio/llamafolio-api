import { getPendlePools } from '@adapters/pendle/common/pool'
import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
import { getMasterChefPoolsContracts, type GetPoolsInfosParams } from '@lib/masterchef/newMasterchef'
import { multicall } from '@lib/multicall'
import type { AbiFunction } from 'abitype'

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
  tokenToPoolInfo_penpie: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'tokenToPoolInfo',
    outputs: [
      { internalType: 'address', name: 'stakingToken', type: 'address' },
      { internalType: 'address', name: 'receiptToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'accPenpiePerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'totalStaked', type: 'uint256' },
      { internalType: 'address', name: 'rewarder', type: 'address' },
      { internalType: 'bool', name: 'isActive', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  tokenToPoolInfo_radpie: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'tokenToPoolInfo',
    outputs: [
      { internalType: 'address', name: 'stakingToken', type: 'address' },
      { internalType: 'address', name: 'receiptToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'accRadpiePerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'totalStaked', type: 'uint256' },
      { internalType: 'address', name: 'rewarder', type: 'address' },
      { internalType: 'bool', name: 'isActive', type: 'bool' },
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
  dlpPoolHelper: {
    inputs: [],
    name: 'dlpPoolHelper',
    outputs: [{ internalType: 'contract IPoolHelper', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  wethAddr: {
    inputs: [],
    name: 'wethAddr',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const masterChefAbi: { [key: string]: AbiFunction } = {
  // ARB
  '0x664cc2bcae1e057eb1ec379598c5b743ad9db6e7': abi.tokenToPoolInfo_magpie,
  '0x0776c06907ce6ff3d9dbf84ba9b3422d7225942d': abi.tokenToPoolInfo_penpie,
  '0xc9cb578d613d729c3c4c8ef7d46cb814570f2baa': abi.tokenToPoolInfo_radpie,

  // BSC
  '0xa3b615667cbd33cfc69843bf11fbb2a1d926bd46': abi.tokenToPoolInfo_magpie,
  '0xb35b3d118c0394e750b4b59d2a2f9307393cd5db': abi.tokenToPoolInfo_penpie,
  '0x1b80eec9b25472c6119ead3b880976fa62e58453': abi.tokenToPoolInfo_radpie,
}

const RDNT: { [key: string]: `0x${string}` } = {
  arbitrum: '0x3082cc23568ea640225c2467653db90e9250aaa0',
  bsc: '0xf7de7e8a6bd59ed41a4b5fe50278b3b7f31384df',
}

export async function getMagpiePools(ctx: BaseContext, masterChef: Contract) {
  const poolsMagpie = await getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getPoolInfos: (ctx, { masterChefAddress, poolLength }) => {
      return getPoolInfos(ctx, { masterChefAddress, poolLength })
    },
  }).then((pools) => pools.map((pool) => ({ ...pool, rewards: masterChef.rewards })))

  return getExtraPropsMagpie(ctx, poolsMagpie, masterChef.address)
}

export async function getPenpiePools(ctx: BaseContext, masterChef: Contract) {
  const poolsPenpie = await getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getPoolInfos: (ctx, { masterChefAddress, poolLength }) => {
      return getPoolInfos(ctx, { masterChefAddress, poolLength })
    },
  }).then((pools) => pools.map((pool) => ({ ...pool, rewards: masterChef.rewards })))

  const fmtPoolsPenpie = await getExtraProps(ctx, poolsPenpie, masterChef.address)

  return getPenpieUnderlyings(ctx, fmtPoolsPenpie, 'penpie')
}

export async function getRadpiePools(ctx: BaseContext, masterChef: Contract) {
  const poolsRadpie = await getMasterChefPoolsContracts(ctx, {
    masterChefAddress: masterChef.address,
    getPoolInfos: (ctx, { masterChefAddress, poolLength }) => {
      return getPoolInfos(ctx, { masterChefAddress, poolLength })
    },
  }).then((pools) => pools.map((pool) => ({ ...pool, rewards: masterChef.rewards })))

  const fmtPoolsRadpie = await getExtraProps(ctx, poolsRadpie, masterChef.address)

  return getRadpieUnderlyings(ctx, fmtPoolsRadpie, 'radpie')
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
    abi: masterChefAbi[masterChefAddress],
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
    abi: masterChefAbi[masterChefAddress],
  })

  const fmtPools: Contract[] = mapSuccessFilter(poolsExtraInfosRes, (res, index) => {
    const [_, __, ___, ____, rewarder, helper] = res.output as any

    return {
      ...pools[index],
      rewarder,
      helper,
    }
  })

  const [bonusRewardsTokensRes, underlyingsTokensRes, lpTokensRes] = await Promise.all([
    multicall({ ctx, calls: fmtPools.map((pool) => ({ target: pool.rewarder })), abi: abi.rewardTokenInfos }),
    multicall({ ctx, calls: fmtPools.map((pool) => ({ target: pool.helper })), abi: abi.depositToken }),
    multicall({ ctx, calls: fmtPools.map((pool) => ({ target: pool.helper })), abi: abi.lpToken }),
  ])

  return mapMultiSuccessFilter(
    underlyingsTokensRes.map((_, i) => [underlyingsTokensRes[i], bonusRewardsTokensRes[i], lpTokensRes[i]]),

    (res, index) => {
      const pool = pools[index]

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

async function getExtraProps(
  ctx: BaseContext,
  pools: Contract[],
  masterChefAddress: `0x${string}`,
): Promise<Contract[]> {
  const poolsExtraInfosRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.address] }) as const),
    abi: masterChefAbi[masterChefAddress],
  })

  const fmtPools: Contract[] = mapSuccessFilter(poolsExtraInfosRes, (res, index) => {
    const [_, _receiptToken, __, ___, ____, _____, rewarder] = res.output as any

    return {
      ...pools[index],
      rewarder,
    }
  })

  const bonusRewardsTokensRes = await multicall({
    ctx,
    calls: fmtPools.map((pool) => ({ target: pool.rewarder })),
    abi: abi.rewardTokenInfos,
  })

  return mapSuccessFilter(bonusRewardsTokensRes, (res, index) => {
    const pool = fmtPools[index]
    const [bonusTokenAddresses] = res.output

    // PNP | RDNT can also appears as extraRewards
    const noDuplicateRewards = bonusTokenAddresses.filter(
      (res: string) => res.toLowerCase() !== (pool.rewards?.[0] as string).toLowerCase(),
    )

    return {
      ...pool,
      rewards: [...(pool.rewards as `0x${string}`[]), ...noDuplicateRewards],
    }
  })
}

async function getPenpieUnderlyings(ctx: BaseContext, pools: Contract[], provider: string): Promise<Contract[]> {
  // 1. We recover all the Pendle pools
  // 2. We merge the PenpiePools in order to recover underlyings from the PendlePools
  const pendlePools = await getPendlePools(ctx)

  return pools.reduce((acc: Contract[], pool) => {
    const matchingPendlePool = pendlePools.find(
      (pendlePool) => pendlePool.address.toLowerCase() === pool.address.toLowerCase(),
    )

    const poolToAdd = matchingPendlePool ? { ...pool, ...matchingPendlePool, provider } : pool
    acc.push(poolToAdd)

    return acc
  }, [])
}

async function getRadpieUnderlyings(ctx: BaseContext, pools: Contract[], provider: string): Promise<Contract[]> {
  const helperRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address }) as const),
    abi: abi.dlpPoolHelper,
  })
  const [token1Res] = await Promise.all([
    multicall({ ctx, calls: mapSuccessFilter(helperRes, (res) => ({ target: res.output })), abi: abi.wethAddr }),
  ])

  pools.forEach((pool, index) => {
    const underlying1 = token1Res[index] && token1Res[index].success ? token1Res[index].output : undefined

    if (underlying1) {
      pool.helper = token1Res[index].input.target
      pool.underlyings = [RDNT[ctx.chain], underlying1]
      pool.provider = provider
    }
  })

  return pools
}
