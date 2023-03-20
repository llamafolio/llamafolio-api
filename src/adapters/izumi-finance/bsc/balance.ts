import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { keyBy, mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
import { Category } from '@lib/category'
import { abi as erc20Abi, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'
import JSBI from 'jsbi'

const abi = {
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
  liquidities: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'liquidities',
    outputs: [
      { internalType: 'int24', name: 'leftPt', type: 'int24' },
      { internalType: 'int24', name: 'rightPt', type: 'int24' },
      { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
      { internalType: 'uint256', name: 'lastFeeScaleX_128', type: 'uint256' },
      { internalType: 'uint256', name: 'lastFeeScaleY_128', type: 'uint256' },
      { internalType: 'uint256', name: 'remainTokenX', type: 'uint256' },
      { internalType: 'uint256', name: 'remainTokenY', type: 'uint256' },
      { internalType: 'uint128', name: 'poolId', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  poolMetas: {
    inputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    name: 'poolMetas',
    outputs: [
      { internalType: 'address', name: 'tokenX', type: 'address' },
      { internalType: 'address', name: 'tokenY', type: 'address' },
      { internalType: 'uint24', name: 'fee', type: 'uint24' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pool: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint24', name: '', type: 'uint24' },
    ],
    name: 'pool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  state: {
    inputs: [],
    name: 'state',
    outputs: [
      { internalType: 'uint160', name: 'sqrtPrice_96', type: 'uint160' },
      { internalType: 'int24', name: 'currentPoint', type: 'int24' },
      { internalType: 'uint16', name: 'observationCurrentIndex', type: 'uint16' },
      { internalType: 'uint16', name: 'observationQueueLen', type: 'uint16' },
      { internalType: 'uint16', name: 'observationNextQueueLen', type: 'uint16' },
      { internalType: 'bool', name: 'locked', type: 'bool' },
      { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
      { internalType: 'uint128', name: 'liquidityX', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  leftMostPt: {
    inputs: [],
    name: 'leftMostPt',
    outputs: [{ internalType: 'int24', name: '', type: 'int24' }],
    stateMutability: 'view',
    type: 'function',
  },
  rightMostPt: {
    inputs: [],
    name: 'rightMostPt',
    outputs: [{ internalType: 'int24', name: '', type: 'int24' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const factory: Contract = {
  chain: 'bsc',
  address: '0xd7de110bd452aab96608ac3750c3730a17993de0',
}

export async function getIzumiBSCBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOf = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const balancesLength = parseInt(balanceOf.output)

  const tokensOfOwnerByIndexRes = await multicall({
    ctx,
    calls: range(0, balancesLength).map((idx) => ({
      target: contract.address,
      params: [ctx.address, idx],
    })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const liquiditiesRes = await multicall({
    ctx,
    calls: tokensOfOwnerByIndexRes.map((tokenIds) =>
      isSuccess(tokenIds) ? { target: contract.address, params: [tokenIds.output] } : null,
    ),
    abi: abi.liquidities,
  })

  const poolsInfosRes = await multicall({
    ctx,
    calls: liquiditiesRes.map((liquidity) =>
      isSuccess(liquidity) ? { target: contract.address, params: [liquidity.output.poolId] } : null,
    ),
    abi: abi.poolMetas,
  })

  const poolsAddressesRes = await multicall({
    ctx,
    calls: poolsInfosRes.map((infos) =>
      isSuccess(infos)
        ? { target: factory.address, params: [infos.output.tokenX, infos.output.tokenY, infos.output.fee] }
        : null,
    ),
    abi: abi.pool,
  })

  const poolsStates = await multicall({
    ctx,
    calls: poolsAddressesRes.map((pool) => (isSuccess(pool) ? { target: pool.output } : null)),
    abi: abi.state,
  })

  const underlyingTokens = await getERC20Details(
    ctx,
    poolsInfosRes.flatMap((infosRes) => (infosRes.success ? [infosRes.output.tokenX, infosRes.output.tokenY] : [])),
  )

  const underlyingTokenByAddress = keyBy(underlyingTokens, 'address', { lowercase: true })

  const sqrt96s = mapSuccessFilter(poolsStates, (res) => res.output.sqrtPrice_96)
  const liquidities = mapSuccessFilter(poolsStates, (res) => res.output.liquidity)
  const lowerTicks = mapSuccessFilter(liquiditiesRes, (res) => res.output.leftPt)
  const upperTicks = mapSuccessFilter(liquiditiesRes, (res) => res.output.rightPt)

  for (let poolIdx = 0; poolIdx < balancesLength; poolIdx++) {
    const poolsInfoRes = poolsInfosRes[poolIdx].output
    const poolsAddressRes = poolsAddressesRes[poolIdx]
    const sqrt96 = sqrt96s[poolIdx]
    const liquidity = liquidities[poolIdx]
    const lowerTick = lowerTicks[poolIdx]
    const upperTick = upperTicks[poolIdx]
    const tokenX = underlyingTokenByAddress[poolsInfoRes.tokenX.toLowerCase()]
    const tokenY = underlyingTokenByAddress[poolsInfoRes.tokenY.toLowerCase()]

    const underlyingAmounts = getUnderlyingAmounts(
      parseInt(liquidity),
      sqrt96,
      parseInt(lowerTick),
      parseInt(upperTick),
    )

    balances.push({
      standard: 'erc721',
      chain: ctx.chain,
      address: poolsAddressRes.output,
      symbol: `${tokenX.symbol}/${tokenY.symbol}`,
      category: 'lp' as Category,
      amount: BigNumber.from('1'),
      underlyings: [
        { ...tokenX, amount: underlyingAmounts[0] },
        { ...tokenY, amount: underlyingAmounts[1] },
      ],
    })
  }
  return balances
}

const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96))

function getTickAtSqrtRatio(sqrtPriceX96: number) {
  const tick = Math.floor(Math.log((sqrtPriceX96 / +Q96) ** 2) / Math.log(1.0001))
  return tick
}

function getUnderlyingAmounts(liquidity: number, sqrtPriceX96: number, tickLow: number, tickHigh: number) {
  const sqrtRatioA = Math.sqrt(1.0001 ** tickLow)
  const sqrtRatioB = Math.sqrt(1.0001 ** tickHigh)

  const currentTick = getTickAtSqrtRatio(sqrtPriceX96)
  const sqrtPrice = sqrtPriceX96 / +Q96

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
