import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { ADDRESS_ZERO } from '@lib/contract'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  STAKE_POSITIONS_LIMIT: {
    inputs: [],
    name: 'STAKE_POSITIONS_LIMIT',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  lpStakes: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'lpStakes',
    outputs: [
      { internalType: 'address', name: 'lpToken', type: 'address' },
      { internalType: 'SD59x18', name: 'amount', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  viewRewards: {
    inputs: [
      { internalType: 'address', name: 'who', type: 'address' },
      { internalType: 'address', name: 'lpToken', type: 'address' },
      { internalType: 'address', name: 'rewardToken', type: 'address' },
    ],
    name: 'viewRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const fxVRSW: Contract = {
  chain: 'polygon',
  address: '0x57999936fC9A9EC0751a8D146CcE11901Be8beD0',
  decimals: 18,
  symbol: 'fxVRSW',
}

const VRSW: Contract = {
  chain: 'arbitrum',
  address: '0xd1E094CabC5aCB9D3b0599C3F76f2D01fF8d3563',
  decimals: 18,
  symbol: 'VRSW',
}

const token: { [key: string]: Contract } = {
  polygon: fxVRSW,
  arbitrum: VRSW,
}

export async function getVirtuFarmBalances(
  ctx: BalancesContext,
  farmer: Contract,
  pairs: Contract[],
): Promise<Balance[]> {
  const limit = await call({ ctx, target: farmer.address, abi: abi.STAKE_POSITIONS_LIMIT })

  const userPositions = await multicall({
    ctx,
    calls: rangeBI(0n, limit).map((i) => ({ target: farmer.address, params: [ctx.address, i] }) as const),
    abi: abi.lpStakes,
  })

  const poolBalances = mapSuccessFilter(userPositions, (res) => {
    const [lpToken, amount] = res.output

    if (lpToken === ADDRESS_ZERO) {
      return { ...token[ctx.chain], amount, category: 'farm' }
    }

    const matchingPair = pairs.find((pair) => pair.address.toLowerCase() === lpToken.toLowerCase())

    if (!matchingPair) return null
    return { ...matchingPair, amount, category: 'farm' }
  }).filter(isNotNullish)

  const pendingRewards = await multicall({
    ctx,
    calls: poolBalances.map(
      (pool) => ({ target: farmer.address, params: [ctx.address, pool.address, token[ctx.chain].address] }) as const,
    ),
    abi: abi.viewRewards,
  })

  const poolBalancesWithRewards = mapSuccessFilter(pendingRewards, (res, index) => ({
    ...poolBalances[index],
    rewards: [{ ...token[ctx.chain], amount: res.output }],
  }))

  return getUnderlyingBalances(ctx, poolBalancesWithRewards)
}
