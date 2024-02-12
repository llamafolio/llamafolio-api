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

export async function get1InchPools(ctx: BaseContext, factory: Contract): Promise<Contract[]> {
  const rawPools: Contract[] = (await call({ ctx, target: factory.address, abi: abi.getAllPools })).map((output) => ({
    chain: ctx.chain,
    address: output,
  }))

  return getPairsDetails(ctx, rawPools)
}

export async function get1InchFarmPools(ctx: BaseContext, boosters: `0x${string}`[]): Promise<Contract[]> {
  const tokens = await multicall({
    ctx,
    calls: boosters.map((booster) => ({ target: booster }) as const),
    abi: abi.mooniswap,
  })

  const pools: Contract[] = mapSuccessFilter(tokens, (res, index) => ({
    chain: ctx.chain,
    address: boosters[index],
    token: res.output,
  }))

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token! })
}
