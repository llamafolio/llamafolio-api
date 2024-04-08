import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  liquidityToken: {
    inputs: [],
    name: 'liquidityToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getJayContracts(ctx: BaseContext, farmers: `0x${string}`[]): Promise<Contract[]> {
  const [liquidities, rewards] = await Promise.all([
    multicall({ ctx, calls: farmers.map((farmer) => ({ target: farmer }) as const), abi: abi.liquidityToken }),
    multicall({ ctx, calls: farmers.map((farmer) => ({ target: farmer }) as const), abi: abi.rewardToken }),
  ])

  const pools: Contract[] = mapSuccessFilter(liquidities, (res, index) => {
    const address = farmers[index]
    return {
      chain: ctx.chain,
      address,
      token: res.output,
      rewards: [rewards[index].output ?? WETH.address],
    }
  })

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token! })
}
