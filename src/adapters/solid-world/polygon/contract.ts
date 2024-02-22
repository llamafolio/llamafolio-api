import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getTokens: {
    inputs: [],
    name: 'getTokens',
    outputs: [{ internalType: 'address[]', name: '_tokens', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getAllRewards: {
    inputs: [],
    name: 'getAllRewards',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
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

export async function getSolidContract(
  ctx: BaseContext,
  controller: Contract,
  rewarder: Contract,
): Promise<Contract[]> {
  const [tokens, rewards] = await Promise.all([
    call({ ctx, target: controller.address, abi: abi.getTokens }),
    call({ ctx, target: rewarder.address, abi: abi.getAllRewards }),
  ])

  const [underlying0s, underlying1s] = await Promise.all([
    multicall({ ctx, calls: tokens.map((token) => ({ target: token }) as const), abi: abi.token0 }),
    multicall({ ctx, calls: tokens.map((token) => ({ target: token }) as const), abi: abi.token1 }),
  ])

  return mapMultiSuccessFilter(
    underlying0s.map((_, i) => [underlying0s[i], underlying1s[i]]),
    (res, index) => {
      const token = tokens[index]
      const [{ output: underlying0 }, { output: underlying1 }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address: token,
        underlyings: [underlying0, underlying1],
        rewards,
      }
    },
  )
}
