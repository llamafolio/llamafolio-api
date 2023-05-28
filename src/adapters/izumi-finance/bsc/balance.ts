import { getUnderlyingAmounts } from '@adapters/uniswap-v3/common/pools'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { flatMapSuccess, keyBy, mapSuccess, range } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20Abi, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

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
} as const

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

  const balancesLength = Number(balanceOf)

  const tokensOfOwnerByIndexRes = await multicall({
    ctx,
    calls: range(0, balancesLength).map(
      (idx) =>
        ({
          target: contract.address,
          params: [ctx.address, BigInt(idx)],
        } as const),
    ),
    abi: abi.tokenOfOwnerByIndex,
  })

  const liquiditiesRes = await multicall({
    ctx,
    calls: mapSuccess(
      tokensOfOwnerByIndexRes,
      (tokenIds) =>
        ({
          target: contract.address,
          params: [tokenIds.output],
        } as const),
    ),
    abi: abi.liquidities,
  })

  const poolsInfosRes = await multicall({
    ctx,
    calls: mapSuccess(liquiditiesRes, (liquidity) => {
      const [
        _leftPt,
        _rightPt,
        _liquidity,
        _lastFeeScaleX_128,
        _lastFeeScaleY_128,
        _remainTokenX,
        _remainTokenY,
        poolId,
      ] = liquidity.output

      return {
        target: contract.address,
        params: [poolId],
      } as const
    }),
    abi: abi.poolMetas,
  })

  const poolsAddressesRes = await multicall({
    ctx,
    calls: mapSuccess(poolsInfosRes, (infos) => ({ target: factory.address, params: infos.output } as const)),
    abi: abi.pool,
  })

  const poolsStates = await multicall({
    ctx,
    calls: mapSuccess(poolsAddressesRes, (pool) => ({ target: pool.output })),
    abi: abi.state,
  })

  const underlyingTokens = await getERC20Details(
    ctx,
    flatMapSuccess(poolsInfosRes, (infosRes) => [infosRes.output[0], infosRes.output[1]]).filter(isNotNullish),
  )

  const underlyingTokenByAddress = keyBy(underlyingTokens, 'address', { lowercase: true })

  for (let poolIdx = 0; poolIdx < balancesLength; poolIdx++) {
    const poolStateRes = poolsStates[poolIdx]
    const poolAddressRes = poolsAddressesRes[poolIdx]
    const poolInfoRes = poolsInfosRes[poolIdx]
    const liquidities = liquiditiesRes[poolIdx]

    if (!poolStateRes.success || !poolAddressRes.success || !poolInfoRes.success || !liquidities.success) {
      continue
    }

    const address = poolAddressRes.output
    const [poolTokenX, poolTokenY] = poolInfoRes.output
    const [
      sqrt96,
      _currentPoint,
      _observationCurrentIndex,
      _observationQueueLen,
      _observationNextQueueLen,
      _locked,
      liquidity,
      _liquidityX,
    ] = poolStateRes.output
    const [leftPt, rightPt] = liquidities.output

    const tokenX = underlyingTokenByAddress[poolTokenX.toLowerCase()]
    const tokenY = underlyingTokenByAddress[poolTokenY.toLowerCase()]

    const underlyingAmounts = getUnderlyingAmounts(Number(liquidity), Number(sqrt96), Number(leftPt), Number(rightPt))

    balances.push({
      standard: 'erc721',
      chain: ctx.chain,
      address,
      symbol: `${tokenX.symbol}/${tokenY.symbol}`,
      category: 'lp' as Category,
      amount: 1n,
      underlyings: [
        { ...tokenX, amount: underlyingAmounts[0] },
        { ...tokenY, amount: underlyingAmounts[1] },
      ],
    })
  }

  return balances
}
