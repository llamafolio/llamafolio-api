import { factory, nonFungiblePositionManager } from '@adapters/uniswap-v3/ethereum'
import { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  uni_token0: {
    inputs: [],
    name: 'uni_token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  uni_token1: {
    inputs: [],
    name: 'uni_token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  lockedNFTsOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'lockedNFTsOf',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'token_id', type: 'uint256' },
          { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
          { internalType: 'uint256', name: 'start_timestamp', type: 'uint256' },
          { internalType: 'uint256', name: 'ending_timestamp', type: 'uint256' },
          { internalType: 'uint256', name: 'lock_multiplier', type: 'uint256' },
          { internalType: 'int24', name: 'tick_lower', type: 'int24' },
          { internalType: 'int24', name: 'tick_upper', type: 'int24' },
        ],
        internalType: 'struct FraxFarm_UniV3_veFXS.LockedNFT[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

import { ProviderBalancesParams } from './interface'

export const uniswapNFTProvider = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const res: Contract[] = []

  const calls: Call[] = pools.map((pool) => ({ target: pool.address }))

  const [token0sRes, token1sRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.uni_token0 }),
    multicall({ ctx, calls, abi: abi.uni_token1 }),
  ])

  pools.forEach((pool, idx) => {
    const token0Res = token0sRes[idx]
    const token1Res = token1sRes[idx]

    if (!isSuccess(token0Res) || !isSuccess(token1Res)) {
      return
    }

    res.push({ ...pool, underlyings: [token0Res.output, token1Res.output] })
  })

  return res
}

export const uniswapNFTBalancesProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const lockedNFTsOfRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
    abi: abi.lockedNFTsOf,
  })

  const tokenIds = lockedNFTsOfRes
    .filter(isSuccess)
    .flatMap((res) => res.output.map((lockedNFT: any) => parseInt(lockedNFT.token_id)))
    .filter((tokenId) => tokenId > 0)

  return getTokenIdsBalances(ctx, nonFungiblePositionManager, factory, tokenIds)
}
