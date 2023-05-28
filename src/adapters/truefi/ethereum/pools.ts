import type { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'

const abi = {
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolValue: {
    inputs: [],
    name: 'poolValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const pools: `0x${string}`[] = [
  '0x1ed460d149d48fa7d91703bf4890f97220c09437', // BUSD
  '0xa991356d261fbaf194463af6df8f0464f8f1c742', // USDC
  '0x6002b1dcb26e7b1aa797a17551c6f487923299d7', // USDT
  '0x97ce06c3e3d027715b2d6c22e67d5096000072e5', // TUSD
  '0xa1e72267084192db7387c8cc1328fade470e4149', // Legacy TUSD
]

export async function getPoolsContracts(ctx: BaseContext) {
  const contracts: Contract[] = []

  const tokensRes = await multicall({ ctx, calls: pools.map((pool) => ({ target: pool })), abi: abi.token })

  for (let i = 0; i < pools.length; i++) {
    const tokenRes = tokensRes[i]

    if (!tokenRes.success) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: pools[i],
      underlyings: [tokenRes.output],
    })
  }

  return contracts
}

export interface PoolSupply extends Contract {
  poolValue: bigint
  totalSupply: bigint
}

export async function getPoolsSupplies(ctx: BaseContext, pools: Contract[]) {
  const poolsSupplies: PoolSupply[] = []

  const calls = pools.map((pool) => ({ target: pool.address }))

  const [poolValues, totalSupplies] = await Promise.all([
    multicall({ ctx, calls, abi: abi.poolValue }),
    multicall({ ctx, calls, abi: abi.totalSupply }),
  ])

  for (let i = 0; i < pools.length; i++) {
    const poolValue = poolValues[i]
    const totalSupply = totalSupplies[i]
    const pool = pools[i]

    if (!poolValue.success || !totalSupply.success) {
      continue
    }

    poolsSupplies.push({
      ...pool,
      poolValue: poolValue.output,
      totalSupply: totalSupply.output,
    })
  }

  return poolsSupplies
}
