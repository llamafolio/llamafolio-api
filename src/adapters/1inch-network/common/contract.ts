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
}

export async function getInchPools(ctx: BaseContext, deployer: Contract): Promise<Contract[]> {
  const { output: allPoolsRes } = await call({ ctx, target: deployer.address, abi: abi.getAllPools })

  const contracts: Contract[] = (allPoolsRes || []).map((address: string) => ({ chain: ctx.chain, address }))

  return getPairsDetails(ctx, contracts)
}

export async function getInchFarmingPools(ctx: BaseContext, pools: string[]): Promise<Contract[]> {
  const lpTokensRes = await multicall({ ctx, calls: pools.map((pool) => ({ target: pool })), abi: abi.mooniswap })

  const contracts: Contract[] = mapSuccessFilter(lpTokensRes, (res, idx) => ({
    chain: ctx.chain,
    address: res.output,
    lpToken: res.output,
    pool: pools[idx],
  }))

  return (await getPairsDetails(ctx, contracts)).map((res) => ({
    ...res,
    address: res.pool,
  }))
}
