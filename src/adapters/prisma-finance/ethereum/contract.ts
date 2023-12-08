import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  lpToken: {
    inputs: [],
    name: 'lpToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const cvxRewards: `0x${string}`[] = [
  '0xda47862a83dac0c112ba89c6abc2159b95afd71c',
  '0xD533a949740bb3306d119CC777fa900bA034cd52',
  '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
]

const crvRewards: `0x${string}`[] = [
  '0xda47862a83dac0c112ba89c6abc2159b95afd71c',
  '0xD533a949740bb3306d119CC777fa900bA034cd52',
]

export async function getPrismaCVXContracts(ctx: BaseContext, addresses: `0x${string}`[]): Promise<Contract[]> {
  const lpTokens = await multicall({
    ctx,
    calls: addresses.map((address) => ({ target: address }) as const),
    abi: abi.lpToken,
  })

  return mapSuccessFilter(lpTokens, (res, index) => ({
    chain: ctx.chain,
    address: addresses[index],
    token: res.output,
    rewards: cvxRewards,
  }))
}

export async function getPrismaCRVContracts(ctx: BaseContext, addresses: `0x${string}`[]): Promise<Contract[]> {
  const lpTokens = await multicall({
    ctx,
    calls: addresses.map((address) => ({ target: address }) as const),
    abi: abi.lpToken,
  })

  return mapSuccessFilter(lpTokens, (res, index) => ({
    chain: ctx.chain,
    address: addresses[index],
    token: res.output,
    rewards: crvRewards,
  }))
}
