import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { keyBy, mapSuccess, mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
import { Category } from '@lib/category'
import { abi as erc20Abi, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { BigNumber } from 'ethers'
import JSBI from 'jsbi'

const abi = {
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
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getPoolsBalances(ctx: BalancesContext, nonFungiblePositionManager: Contract, factory: Contract) {
  // # of NFTs
  const balanceOf = await call({
    ctx,
    target: nonFungiblePositionManager.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const balancesLength = parseInt(balanceOf.output)

  // token IDs
  const tokensOfOwnerByIndexRes = await multicall({
    ctx,
    calls: range(0, balancesLength).map((idx) => ({
      target: nonFungiblePositionManager.address,
      params: [ctx.address, idx],
    })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokenIds = mapSuccessFilter(tokensOfOwnerByIndexRes, (res) => res.output)

  return getTokenIdsBalances(ctx, nonFungiblePositionManager, factory, tokenIds)
}

export async function getTokenIdsBalances(
  ctx: BalancesContext,
  nonFungiblePositionManager: Contract,
  factory: Contract,
  tokenIds: number[],
) {
  // positions
  const positionsRes = await multicall({
    ctx,
    calls: tokenIds.map((tokenId) => ({
      target: nonFungiblePositionManager.address,
      params: [tokenId],
    })),
    abi: abi.positions,
  })

  // pools
  const poolsRes = await multicall({
    ctx,
    calls: mapSuccess(positionsRes, (positionRes) => ({
      target: factory.address,
      params: [positionRes.output.token0, positionRes.output.token1, positionRes.output.fee],
    })),
    abi: abi.getPools,
  })

  const [slots0sRes, ticksLowerRes, ticksUpperRes, feesGrowthGlobal0X128Res, feesGrowthGlobal1X128Res] =
    await Promise.all([
      multicall({
        ctx,
        calls: mapSuccess(poolsRes, (poolRes) => ({ target: poolRes.output })),
        abi: abi.slot0,
      }),

      multicall({
        ctx,
        calls: mapSuccess(poolsRes, (poolRes, idx) => ({
          target: poolRes.output,
          params: [positionsRes[idx].output.tickLower],
        })),
        abi: abi.ticks,
      }),

      multicall({
        ctx,
        calls: mapSuccess(poolsRes, (poolRes, idx) => ({
          target: poolRes.output,
          params: [positionsRes[idx].output.tickUpper],
        })),
        abi: abi.ticks,
      }),

      multicall({
        ctx,
        calls: mapSuccess(poolsRes, (poolRes) => ({ target: poolRes.output })),
        abi: abi.feeGrowthGlobal0X128,
      }),

      multicall({
        ctx,
        calls: mapSuccess(poolsRes, (poolRes) => ({ target: poolRes.output })),
        abi: abi.feeGrowthGlobal1X128,
      }),
    ])

  const underlyingTokens = await getERC20Details(
    ctx,
    positionsRes.flatMap((positionRes) =>
      positionRes.success ? [positionRes.output.token0, positionRes.output.token1] : [],
    ),
  )
  const underlyingTokenByAddress = keyBy(underlyingTokens, 'address', { lowercase: true })

  return slots0sRes
    .map((slot0Res, idx) => {
      const pool = poolsRes[idx].output
      const position = positionsRes[idx].output
      const token0 = underlyingTokenByAddress[position.token0.toLowerCase()]
      const token1 = underlyingTokenByAddress[position.token1.toLowerCase()]

      if (!slot0Res.success || !token0 || !token1) {
        return null
      }

      const underlyingAmounts = getUnderlyingAmounts(
        parseInt(position.liquidity),
        slot0Res.output.sqrtPriceX96,
        parseInt(position.tickLower),
        parseInt(position.tickUpper),
      )

      const balance: Balance = {
        standard: 'erc721',
        chain: ctx.chain,
        address: pool,
        symbol: `${token0.symbol}/${token1.symbol}`,
        category: 'lp' as Category,
        amount: BigNumber.from('1'),
        underlyings: [
          { ...token0, amount: underlyingAmounts[0] },
          { ...token1, amount: underlyingAmounts[1] },
        ],
      }

      // Rewards
      const tickLowerRes = ticksLowerRes[idx]
      const tickUpperRes = ticksUpperRes[idx]
      const feeGrowthGlobal0X128Res = feesGrowthGlobal0X128Res[idx]
      const feeGrowthGlobal1X128Res = feesGrowthGlobal1X128Res[idx]

      if (
        tickLowerRes.success &&
        tickUpperRes.success &&
        feeGrowthGlobal0X128Res.success &&
        feeGrowthGlobal1X128Res.success
      ) {
        const rewardAmounts = getRewardAmounts(
          feeGrowthGlobal0X128Res.output,
          feeGrowthGlobal1X128Res.output,
          tickLowerRes.output.feeGrowthOutside0X128,
          tickUpperRes.output.feeGrowthOutside0X128,
          position.feeGrowthInside0LastX128,
          tickLowerRes.output.feeGrowthOutside1X128,
          tickUpperRes.output.feeGrowthOutside1X128,
          position.feeGrowthInside1LastX128,
          parseInt(position.liquidity),
          parseInt(position.tickLower),
          parseInt(position.tickUpper),
          parseInt(slot0Res.output.tick),
        )

        balance.rewards = [
          { ...token0, amount: rewardAmounts[0] },
          { ...token1, amount: rewardAmounts[1] },
        ]
      }

      return balance
    })
    .filter(isNotNullish)
}

// TODO: migrate to ethers v6 and replace JSBI and BigNUmber with native BigInt

// Note: https://uniswap.org/blog/uniswap-v3-math-primer
// Note: ethereum.stackexchange.com/questions/139809/how-to-get-a-virtual-and-real-reserves-from-uniswap-v3-pair
// Note: https://ethereum.stackexchange.com/questions/101955/trying-to-make-sense-of-uniswap-v3-fees-feegrowthinside0lastx128-feegrowthglob

const ZERO = JSBI.BigInt(0)
const Q128 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(128))
const Q256 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(256))
const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96))

export function getTickAtSqrtRatio(sqrtPriceX96: number) {
  const tick = Math.floor(Math.log((sqrtPriceX96 / Q96) ** 2) / Math.log(1.0001))
  return tick
}

export function getUnderlyingAmounts(liquidity: number, sqrtPriceX96: number, tickLow: number, tickHigh: number) {
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
