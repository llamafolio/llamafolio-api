import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  uni: {
    inputs: [],
    name: 'uni',
    outputs: [{ internalType: 'contract IERC20Upgradeable', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenDistro: {
    inputs: [],
    name: 'tokenDistro',
    outputs: [{ internalType: 'contract IDistro', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract IERC20Upgradeable', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGivethPools(ctx: BaseContext, poolAddresses: `0x${string}`[]): Promise<Contract[]> {
  const [tokensRes, rewardersRes] = await Promise.all([
    multicall({ ctx, calls: poolAddresses.map((address) => ({ target: address }) as const), abi: abi.uni }),
    multicall({ ctx, calls: poolAddresses.map((address) => ({ target: address }) as const), abi: abi.tokenDistro }),
  ])

  const rewardstokensRes = await multicall({
    ctx,
    calls: mapSuccessFilter(rewardersRes, (res) => ({ target: res.output }) as const),
    abi: abi.token,
  })

  const pools: Contract[] = mapSuccessFilter(tokensRes, (res, index) => {
    const poolAddress = poolAddresses[index]
    const reward: any = rewardstokensRes[index].success ? rewardstokensRes[index].output : undefined

    return {
      chain: ctx.chain,
      address: poolAddress,
      token: res.output,
      rewards: [reward],
    }
  })

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token! })
}
