import type { BaseContext, Contract } from '@lib/adapter'
import { flatMapSuccess, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  getDeployers: {
    inputs: [],
    name: 'getDeployers',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPools: {
    inputs: [
      {
        internalType: 'address',
        name: 'deployer',
        type: 'address',
      },
    ],
    name: 'getPools',
    outputs: [
      {
        internalType: 'address[]',
        name: '',
        type: 'address[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  staking_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'staking_token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    gas: 3078,
  },
  token0: {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token1: {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  reward_count: {
    stateMutability: 'view',
    type: 'function',
    name: 'reward_count',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3450,
  },
  reward_tokens: {
    stateMutability: 'view',
    type: 'function',
    name: 'reward_tokens',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3525,
  },
} as const

export async function getVaults(ctx: BaseContext, factoryArrakis: Contract) {
  const poolsDeployers = await call({
    ctx,
    target: factoryArrakis.address,
    abi: abi.getDeployers,
  })

  const deployedPools = await multicall({
    ctx,
    calls: poolsDeployers.map(
      (deployer) =>
        ({
          target: factoryArrakis.address,
          params: [deployer],
        }) as const,
    ),
    abi: abi.getPools,
  })

  const pools: Contract[] = []
  for (let idx = 0; idx < deployedPools.length; idx++) {
    const deployedPool = deployedPools[idx]
    if (!deployedPool.success) {
      continue
    }

    for (const pool of deployedPool.output) {
      pools.push({
        chain: ctx.chain,
        address: pool,
      })
    }
  }

  return getPairsDetails(ctx, pools)
}

export async function getFarmersContracts(ctx: BaseContext, farmers: `0x${string}`[]): Promise<Contract[]> {
  const rewardsMap: { [key: string]: any[] } = {}

  const tokensRes = await multicall({
    ctx,
    calls: farmers.map((farmer) => ({ target: farmer }) as const),
    abi: abi.staking_token,
  })

  const pools: Contract[] = mapSuccessFilter(tokensRes, (res, idx) => ({
    chain: ctx.chain,
    address: res.output,
    token: res.output,
    staker: farmers[idx],
  }))

  const poolsRewardsLength = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.staker }) as const),
    abi: abi.reward_count,
  })

  const poolsRewardsRes = await multicall({
    ctx,
    calls: flatMapSuccess(poolsRewardsLength, (res) =>
      rangeBI(0n, res.output).map((idx) => ({ target: res.input.target, params: [idx] }) as const),
    ).flat(),
    abi: abi.reward_tokens,
  })

  poolsRewardsRes.forEach((res) => {
    if (res.success) {
      const address = res.input.target
      if (!rewardsMap[address]) rewardsMap[address] = []
      rewardsMap[address].push(res.output)
    }
  })

  pools.forEach((pool) => {
    const address = pool.staker
    pool.rewards = rewardsMap[address] || []
  })

  const fmtPools = await getPairsDetails(ctx, pools)

  for (let i = 0; i < fmtPools.length; i++) {
    const contractIndex = pools.findIndex((c) => c.address === fmtPools[i].address)
    if (contractIndex !== -1) {
      pools[contractIndex] = Object.assign({}, pools[contractIndex], fmtPools[i])
    }
  }

  return pools.map((pool) => ({ ...pool, address: pool.staker }))
}
