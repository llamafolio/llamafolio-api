import { BaseContext, Contract } from '@lib/adapter'
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
  const contracts: Contract[] = []

  const { output: allPoolsRes } = await call({ ctx, target: deployer.address, abi: abi.getAllPools })

  allPoolsRes.forEach((pool: string) => {
    contracts.push({ chain: ctx.chain, address: pool })
  })

  const poolsWithUnderlyings = await getPairsDetails(ctx, contracts)

  return poolsWithUnderlyings
}

export async function getInchFarmingPools(ctx: BaseContext, pools: string[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const lpTokensRes = await multicall({ ctx, calls: pools.map((pool) => ({ target: pool })), abi: abi.mooniswap })

  pools.forEach((pool, poolIdx) => {
    const lpTokenRes = lpTokensRes[poolIdx]
    contracts.push({ chain: ctx.chain, address: lpTokenRes.output, lpToken: lpTokenRes.output, pool })
  })

  const poolsWithUnderlyings = (await getPairsDetails(ctx, contracts)).map((res) => ({
    ...res,
    address: res.pool,
  }))

  return poolsWithUnderlyings
}
