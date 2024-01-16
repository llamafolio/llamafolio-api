import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  lpToken: {
    constant: true,
    inputs: [],
    name: 'lpToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  cycToken: {
    constant: true,
    inputs: [],
    name: 'cycToken',
    outputs: [{ internalType: 'contract IMintableToken', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCycloneContract(ctx: BaseContext, pool: Contract): Promise<Contract[]> {
  const [lpToken, rewardToken] = await Promise.all([
    call({ ctx, target: pool.address, abi: abi.lpToken }),
    call({ ctx, target: pool.address, abi: abi.cycToken }),
  ])
  return getPairsDetails(ctx, [{ ...pool, token: lpToken, rewards: [rewardToken] }], {
    getAddress: (contract) => contract.token!,
  })
}
