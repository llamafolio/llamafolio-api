import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  getAllPools: {
    inputs: [],
    name: 'getAllPools',
    outputs: [{ internalType: 'contract Mooniswap[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  mooniswap: {
    inputs: [],
    name: 'mooniswap',
    outputs: [{ internalType: 'contract Mooniswap', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getInchPools(ctx: BaseContext, deployer: Contract) {
  const allPoolsRes = await call({ ctx, target: deployer.address, abi: abi.getAllPools })

  const contracts = allPoolsRes.map((address) => ({ chain: ctx.chain, address }))

  return getPairsDetails(ctx, contracts)
}

export async function getInchFarmingPools(ctx: BaseContext, pools: `0x${string}`[]) {
  const lpTokensRes = await multicall({ ctx, calls: pools.map((pool) => ({ target: pool })), abi: abi.mooniswap })

  const contracts = mapSuccessFilter(lpTokensRes, (res, idx) => ({
    chain: ctx.chain,
    address: pools[idx],
    token: res.output,
  }))

  return getPairsDetails(ctx, contracts, { getAddress: (contract) => contract.token })
}
