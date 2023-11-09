import { getPendlePools } from '@adapters/pendle/common/pool'
import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
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

async function getPoolInfos(ctx: BaseContext, { masterChefAddress, poolLength }: GetPoolsInfosParams) {
  const poolsAddressesRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolLength).map((i) => ({ target: masterChefAddress, params: [i] }) as const),
    abi: abi.registeredToken,
  })

  const poolInfos = await multicall({
    ctx,
    calls: mapSuccessFilter(poolsAddressesRes, (res) => ({ target: masterChefAddress, params: [res.output] }) as const),
    abi: abi.tokenToPoolInfo_penpie,
  })

  return mapSuccessFilter(poolInfos, (res) => {
    return { chain: ctx.chain, address: res.output[0], pid: res.input.params![0] }
  })
}

async function getExtraProps(
  ctx: BaseContext,
  pools: Contract[],
  masterChefAddress: `0x${string}`,
): Promise<Contract[]> {
  const poolsExtraInfosRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.address] }) as const),
    abi: abi.tokenToPoolInfo_penpie,
  })

  const fmtPools: Contract[] = mapSuccessFilter(poolsExtraInfosRes, (res, index) => {
    const [_, _receiptToken, __, ___, ____, _____, rewarder] = res.output as any

    return { ...pools[index], rewarder }
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

    return { ...pool, rewards: [...(pool.rewards as `0x${string}`[]), ...noDuplicateRewards] }
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
