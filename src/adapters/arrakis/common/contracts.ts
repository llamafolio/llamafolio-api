import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
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
  const contracts: Contract[] = []

  const tokensRes = await multicall({
    ctx,
    calls: farmers.map((farmer) => ({ target: farmer }) as const),
    abi: abi.staking_token,
  })

  const [underlying0Res, underlying1Res] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(tokensRes, (res) => ({ target: res.output }) as const),
      abi: abi.token0,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(tokensRes, (res) => ({ target: res.output }) as const),
      abi: abi.token1,
    }),
  ])

  for (const [index, farmer] of farmers.entries()) {
    const underlying0 = underlying0Res[index]
    const underlying1 = underlying1Res[index]

    if (!underlying0.success || !underlying1.success) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: farmer,
      token: underlying0.input.target,
      underlyings: [underlying0.output, underlying1.output],
    })
  }

  return contracts
}
