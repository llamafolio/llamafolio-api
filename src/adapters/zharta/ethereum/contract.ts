import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  erc20TokenContract: {
    stateMutability: 'view',
    type: 'function',
    name: 'erc20TokenContract',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  lendingPoolCoreContract: {
    stateMutability: 'view',
    type: 'function',
    name: 'lendingPoolCoreContract',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
} as const

export async function getZhartaStakersContracts(
  ctx: BaseContext,
  stakersAddresses: `0x${string}`[],
): Promise<Contract[]> {
  const [tokens, pools] = await Promise.all([
    multicall({
      ctx,
      calls: stakersAddresses.map((address) => ({ target: address }) as const),
      abi: abi.erc20TokenContract,
    }),
    multicall({
      ctx,
      calls: stakersAddresses.map((address) => ({ target: address }) as const),
      abi: abi.lendingPoolCoreContract,
    }),
  ])

  return mapMultiSuccessFilter(
    tokens.map((_, i) => [tokens[i], pools[i]]),

    (res, index) => {
      const address = stakersAddresses[index]
      const [{ output: token }, { output: staker }] = res.inputOutputPairs
      return { chain: ctx.chain, address, token, staker }
    },
  )
}
