// @ts-nocheck

import { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'
import JSBI from 'jsbi'

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
  getPools: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint24', name: '', type: 'uint24' },
    ],
    name: 'getPool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
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
  const balances: ProviderBalancesParams[] = []

  for (const pool of pools) {
    const underlyings = pool.underlyings as Contract[]
    if (!underlyings) {
      continue
    }

    const { output: uniNFTIdsRes } = await call({
      ctx,
      target: pool.address,
      params: [ctx.address],
      abi: abi.lockedNFTsOf,
    })

    const nftIds = uniNFTIdsRes.map((res: any) => res)

    const positionsRes = await multicall({
      ctx,
      calls: nftIds.map((res: any) => ({ target: nunFungibleManager.address, params: [res.token_id] })),
      abi: abi.positions,
    })

    const positions = positionsRes.filter(isSuccess).map((res) => res.output)

    const lowerCalls: Call[] = positions.map((position) => ({
      target: pool.uniPoolAddress!,
      params: [position.tickLower],
    }))

    const upperCalls: Call[] = positions.map((position) => ({
      target: pool.uniPoolAddress!,
      params: [position.tickLower],
    }))

    const [slots0sRes, ticksLowerRes, ticksUpperRes, feesGrowthGlobal0X128Res, feesGrowthGlobal1X128Res] =
      await Promise.all([
        call({ ctx, target: pool.uniPoolAddress!, abi: abi.slot0 }),
        multicall({ ctx, calls: lowerCalls, abi: abi.ticks }),
        multicall({ ctx, calls: upperCalls, abi: abi.ticks }),
        call({ ctx, target: pool.uniPoolAddress!, abi: abi.feeGrowthGlobal0X128 }),
        call({ ctx, target: pool.uniPoolAddress!, abi: abi.feeGrowthGlobal1X128 }),
      ])

    for (let positionIdx = 0; positionIdx < positions.length; positionIdx++) {
      const position = positions[positionIdx]
      if (!isSuccess(slots0sRes)) {
        continue
      }

      const underlyingAmounts = getUnderlyingAmounts(
        parseInt(position.liquidity),
        slots0sRes.output.sqrtPriceX96,
        parseInt(position.tickLower),
        parseInt(position.tickUpper),
      )

      const balance: ProviderBalancesParams = {
        ...pool,
        standard: 'erc721',
        symbol: `${underlyings[0].symbol}/${underlyings[1].symbol}`,
        category: 'farm',
        amount: BigNumber.from(1),
        underlyings: [
          { ...underlyings[0], amount: underlyingAmounts[0] },
          { ...underlyings[1], amount: underlyingAmounts[1] },
        ],
      }

      balances.push(balance)
    }
  }
  return balances
}

const ZERO = JSBI.BigInt(0)
const Q128 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(128))
const Q256 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(256))
const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96))

function getTickAtSqrtRatio(sqrtPriceX96: number) {
  const tick = Math.floor(Math.log((sqrtPriceX96 / Q96) ** 2) / Math.log(1.0001))
  return tick
}

function getUnderlyingAmounts(liquidity: number, sqrtPriceX96: number, tickLow: number, tickHigh: number) {
  const sqrtRatioA = Math.sqrt(1.0001 ** tickLow)
  const sqrtRatioB = Math.sqrt(1.0001 ** tickHigh)

  const currentTick = getTickAtSqrtRatio(sqrtPriceX96)
  const sqrtPrice = sqrtPriceX96 / Q96

  let amount0 = 0
  let amount1 = 0
  if (currentTick <= tickLow) {
    amount0 = Math.floor(liquidity * ((sqrtRatioB - sqrtRatioA) / (sqrtRatioA * sqrtRatioB)))
  } else if (currentTick > tickHigh) {
    amount1 = Math.floor(liquidity * (sqrtRatioB - sqrtRatioA))
  } else if (currentTick >= tickLow && currentTick < tickHigh) {
    amount0 = Math.floor(liquidity * ((sqrtRatioB - sqrtPrice) / (sqrtPrice * sqrtRatioB)))
    amount1 = Math.floor(liquidity * (sqrtPrice - sqrtRatioA))
  }

  return [
    // Note: convert exponent to fullwide string to please BigNumber
    BigNumber.from(amount0.toLocaleString('fullwide', { useGrouping: false })),
    BigNumber.from(amount1.toLocaleString('fullwide', { useGrouping: false })),
  ]
}

function toBigNumber(numstr: string) {
  let bi = numstr
  if (typeof sqrtRatio !== 'bigint') {
    bi = JSBI.BigInt(numstr)
  }
  return bi
}

function subIn256(x, y) {
  const difference = JSBI.subtract(x, y)

  if (JSBI.lessThan(difference, ZERO)) {
    return JSBI.add(Q256, difference)
  } else {
    return difference
  }
}

function getRewardAmounts(
  feeGrowthGlobal0: string,
  feeGrowthGlobal1: string,
  feeGrowth0Low: string,
  feeGrowth0Hi: string,
  feeGrowthInside0: string,
  feeGrowth1Low: string,
  feeGrowth1Hi: string,
  feeGrowthInside1: string,
  liquidity: number,
  tickLower: number,
  tickUpper: number,
  tickCurrent: number,
) {
  const feeGrowthGlobal_0 = toBigNumber(feeGrowthGlobal0)
  const feeGrowthGlobal_1 = toBigNumber(feeGrowthGlobal1)

  const tickLowerFeeGrowthOutside_0 = toBigNumber(feeGrowth0Low)
  const tickLowerFeeGrowthOutside_1 = toBigNumber(feeGrowth1Low)

  const tickUpperFeeGrowthOutside_0 = toBigNumber(feeGrowth0Hi)
  const tickUpperFeeGrowthOutside_1 = toBigNumber(feeGrowth1Hi)

  let tickLowerFeeGrowthBelow_0 = ZERO
  let tickLowerFeeGrowthBelow_1 = ZERO
  let tickUpperFeeGrowthAbove_0 = ZERO
  let tickUpperFeeGrowthAbove_1 = ZERO

  if (tickCurrent >= tickUpper) {
    tickUpperFeeGrowthAbove_0 = subIn256(feeGrowthGlobal_0, tickUpperFeeGrowthOutside_0)
    tickUpperFeeGrowthAbove_1 = subIn256(feeGrowthGlobal_1, tickUpperFeeGrowthOutside_1)
  } else {
    tickUpperFeeGrowthAbove_0 = tickUpperFeeGrowthOutside_0
    tickUpperFeeGrowthAbove_1 = tickUpperFeeGrowthOutside_1
  }

  if (tickCurrent >= tickLower) {
    tickLowerFeeGrowthBelow_0 = tickLowerFeeGrowthOutside_0
    tickLowerFeeGrowthBelow_1 = tickLowerFeeGrowthOutside_1
  } else {
    tickLowerFeeGrowthBelow_0 = subIn256(feeGrowthGlobal_0, tickLowerFeeGrowthOutside_0)
    tickLowerFeeGrowthBelow_1 = subIn256(feeGrowthGlobal_1, tickLowerFeeGrowthOutside_1)
  }

  const fr_t1_0 = subIn256(subIn256(feeGrowthGlobal_0, tickLowerFeeGrowthBelow_0), tickUpperFeeGrowthAbove_0)
  const fr_t1_1 = subIn256(subIn256(feeGrowthGlobal_1, tickLowerFeeGrowthBelow_1), tickUpperFeeGrowthAbove_1)

  const feeGrowthInsideLast_0 = toBigNumber(feeGrowthInside0)
  const feeGrowthInsideLast_1 = toBigNumber(feeGrowthInside1)

  const uncollectedFees_0 = Math.floor((liquidity * subIn256(fr_t1_0, feeGrowthInsideLast_0)) / Q128)
  const uncollectedFees_1 = Math.floor((liquidity * subIn256(fr_t1_1, feeGrowthInsideLast_1)) / Q128)

  return [
    // Note: convert exponent to fullwide string to please BigNumber
    BigNumber.from(uncollectedFees_0.toLocaleString('fullwide', { useGrouping: false })),
    BigNumber.from(uncollectedFees_1.toLocaleString('fullwide', { useGrouping: false })),
  ]
}
