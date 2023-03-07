import { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
  lp_pool: {
    inputs: [],
    name: 'lp_pool',
    outputs: [{ internalType: 'contract IUniswapV3Pool', name: '', type: 'address' }],
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
  positions: {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'positions',
    outputs: [
      { internalType: 'uint96', name: 'nonce', type: 'uint96' },
      { internalType: 'address', name: 'operator', type: 'address' },
      { internalType: 'address', name: 'token0', type: 'address' },
      { internalType: 'address', name: 'token1', type: 'address' },
      { internalType: 'uint24', name: 'fee', type: 'uint24' },
      { internalType: 'int24', name: 'tickLower', type: 'int24' },
      { internalType: 'int24', name: 'tickUpper', type: 'int24' },
      { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
      { internalType: 'uint256', name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { internalType: 'uint256', name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { internalType: 'uint128', name: 'tokensOwed0', type: 'uint128' },
      { internalType: 'uint128', name: 'tokensOwed1', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  slot0: {
    inputs: [],
    name: 'slot0',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
      { internalType: 'int24', name: 'tick', type: 'int24' },
      { internalType: 'uint16', name: 'observationIndex', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinality', type: 'uint16' },
      { internalType: 'uint16', name: 'observationCardinalityNext', type: 'uint16' },
      { internalType: 'uint8', name: 'feeProtocol', type: 'uint8' },
      { internalType: 'bool', name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  ticks: {
    inputs: [{ internalType: 'int24', name: '', type: 'int24' }],
    name: 'ticks',
    outputs: [
      { internalType: 'uint128', name: 'liquidityGross', type: 'uint128' },
      { internalType: 'int128', name: 'liquidityNet', type: 'int128' },
      { internalType: 'uint256', name: 'feeGrowthOutside0X128', type: 'uint256' },
      { internalType: 'uint256', name: 'feeGrowthOutside1X128', type: 'uint256' },
      { internalType: 'int56', name: 'tickCumulativeOutside', type: 'int56' },
      { internalType: 'uint160', name: 'secondsPerLiquidityOutsideX128', type: 'uint160' },
      { internalType: 'uint32', name: 'secondsOutside', type: 'uint32' },
      { internalType: 'bool', name: 'initialized', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  feeGrowthGlobal0X128: {
    inputs: [],
    name: 'feeGrowthGlobal0X128',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  feeGrowthGlobal1X128: {
    inputs: [],
    name: 'feeGrowthGlobal1X128',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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

const nunFungibleManager: Contract = {
  chain: 'ethereum',
  address: '0xc36442b4a4522e871399cd717abdd847ab11fe88',
}

export const uniswapNFTBalancesProvider = async (
  ctx: BalancesContext,
  pools: ProviderBalancesParams[],
): Promise<ProviderBalancesParams[]> => {
  const uniPools: Contract[] = []

  const calls: Call[] = pools.map((pool) => ({ target: pool.address, params: [ctx.address] }))

  const uniNFTIds = await multicall({ ctx, calls, abi: abi.lockedNFTsOf })

  const positionsRes = await multicall({
    ctx,
    calls: uniNFTIds.map((tokenIdRes) =>
      tokenIdRes.success ? { target: nunFungibleManager.address, params: [tokenIdRes.output] } : null,
    ),
    abi: abi.positions,
  })

  // const [slots0sRes, ticksLowerRes, ticksUpperRes, feesGrowthGlobal0X128Res, feesGrowthGlobal1X128Res] =
  //   await Promise.all([
  //     multicall({
  //       ctx,
  //       // calls: poolsRes.map((poolRes) => (poolRes.success ? { target: poolRes.output } : null)),
  //       calls: pools.map((pool) => ({target: pool.uniPoolAddress}))
  //       abi: abi.slot0,
  //     }),

  //     multicall({
  //       ctx,
  //       calls: poolsRes.map((poolRes, idx) =>
  //         poolRes.success
  //           ? {
  //               target: poolRes.output,
  //               params: [positionsRes[idx].output.tickLower],
  //             }
  //           : null,
  //       ),
  //       abi: abi.ticks,
  //     }),

  //     multicall({
  //       ctx,
  //       calls: poolsRes.map((poolRes, idx) =>
  //         poolRes.success
  //           ? {
  //               target: poolRes.output,
  //               params: [positionsRes[idx].output.tickUpper],
  //             }
  //           : null,
  //       ),
  //       abi: abi.ticks,
  //     }),

  //     multicall({
  //       ctx,
  //       calls: poolsRes.map((poolRes) => (poolRes.success ? { target: poolRes.output } : null)),
  //       abi: abi.feeGrowthGlobal0X128,
  //     }),

  //     multicall({
  //       ctx,
  //       calls: poolsRes.map((poolRes) => (poolRes.success ? { target: poolRes.output } : null)),
  //       abi: abi.feeGrowthGlobal1X128,
  //     }),
  //   ])



}

//   return pools
