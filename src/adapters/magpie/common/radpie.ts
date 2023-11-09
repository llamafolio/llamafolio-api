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

const RDNT: { [key: string]: `0x${string}` } = {
  arbitrum: '0x3082cc23568ea640225c2467653db90e9250aaa0',
  bsc: '0xf7de7e8a6bd59ed41a4b5fe50278b3b7f31384df',
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

  const poolInfos = await multicall({
    ctx,
    calls: mapSuccessFilter(poolsAddressesRes, (res) => ({ target: masterChefAddress, params: [res.output] }) as const),
    abi: abi.tokenToPoolInfo_radpie,
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
    abi: abi.tokenToPoolInfo_radpie,
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

async function getRadpieUnderlyings(ctx: BaseContext, pools: Contract[], provider: string): Promise<Contract[]> {
  const helperRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address }) as const),
    abi: abi.dlpPoolHelper,
  })

  const token1Res = await multicall({
    ctx,
    calls: mapSuccessFilter(helperRes, (res) => ({ target: res.output })),
    abi: abi.wethAddr,
  })

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
