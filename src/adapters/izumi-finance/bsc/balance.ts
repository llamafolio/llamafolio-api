import { getUnderlyingAmounts } from '@adapters/uniswap-v3/common/pools'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { flatMapSuccess, keyBy, mapSuccess, range } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20Abi, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
    calls: range(0, balancesLength).map((idx) => ({
      target: contract.address,
      params: [ctx.address, idx],
    })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const liquiditiesRes = await multicall({
    ctx,
    calls: mapSuccess(tokensOfOwnerByIndexRes, (tokenIds) => ({
      target: contract.address,
      params: [tokenIds.output],
    })),
    abi: abi.liquidities,
  })

  const poolsInfosRes = await multicall({
    ctx,
    calls: mapSuccess(liquiditiesRes, (liquidity) => ({
      target: contract.address,
      params: [liquidity.output.poolId],
    })),
    abi: abi.poolMetas,
  })

  const poolsAddressesRes = await multicall({
    ctx,
    calls: mapSuccess(poolsInfosRes, (infos) => ({
      target: factory.address,
      params: [infos.output.tokenX, infos.output.tokenY, infos.output.fee],
    })),
    abi: abi.pool,
  })

  const poolsStates = await multicall({
    ctx,
    calls: mapSuccess(poolsAddressesRes, (pool) => ({ target: pool.output })),
    abi: abi.state,
  })

  const underlyingTokens = await getERC20Details(
    ctx,
    flatMapSuccess(poolsInfosRes, (infosRes) => [infosRes.output.tokenX, infosRes.output.tokenY]),
  )

  const underlyingTokenByAddress = keyBy(underlyingTokens, 'address', { lowercase: true })

  for (let poolIdx = 0; poolIdx < balancesLength; poolIdx++) {
    const poolStateRes = poolsStates[poolIdx]
    if (!isSuccess(poolStateRes)) {
      continue
    }

    const address = poolsAddressesRes[poolIdx].output
    const poolInfo = poolsInfosRes[poolIdx].output
    const poolState = poolsStates[poolIdx].output
    const { liquidity, sqrtPrice_96: sqrt96 } = poolState
    const liquidities = liquiditiesRes[poolIdx].output
    const { leftPt: lowerTick, rightPt: upperTick } = liquidities
    const tokenX = underlyingTokenByAddress[poolInfo.tokenX.toLowerCase()]
    const tokenY = underlyingTokenByAddress[poolInfo.tokenY.toLowerCase()]

    const underlyingAmounts = getUnderlyingAmounts(
      parseInt(liquidity),
      parseInt(sqrt96),
      parseInt(lowerTick),
      parseInt(upperTick),
    )

    balances.push({
      standard: 'erc721',
      chain: ctx.chain,
      address,
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
