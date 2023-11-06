import { getPendle_LPUnderlyingsBalances } from '@adapters/pendle/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import { parseEther } from 'viem'

const abi = {
  stakingInfo: {
    inputs: [
      { internalType: 'address', name: '_stakingToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'stakingInfo',
    outputs: [
      { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'availableAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  allPendingTokens: {
    inputs: [
      { internalType: 'address', name: '_stakingToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'allPendingTokens',
    outputs: [
      { internalType: 'uint256', name: 'pendingMGP', type: 'uint256' },
      { internalType: 'address[]', name: 'bonusTokenAddresses', type: 'address[]' },
      { internalType: 'string[]', name: 'bonusTokenSymbols', type: 'string[]' },
      { internalType: 'uint256[]', name: 'pendingBonusRewards', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getReserves: {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint256', name: 'rdnt', type: 'uint256' },
      { internalType: 'uint256', name: 'weth', type: 'uint256' },
      { internalType: 'uint256', name: 'lpTokenSupply', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface BalanceFunction {
  (ctx: BalancesContext, balances: Balance[]): Promise<Balance[]>
}

type MagpieBalance = Balance & {
  provider: string
}

const getUnderlyings: Record<string, BalanceFunction | undefined> = {
  penpie: getPendle_LPUnderlyingsBalances,
  radpie: getRadpieUnderlyings,
}

export async function getMasterMagpieBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterChef: Contract,
): Promise<Balance[][]> {
  const [userBalances, userPendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: masterChef.address, params: [pool.address, ctx.address] }) as const),
      abi: abi.stakingInfo,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: masterChef.address, params: [pool.address, ctx.address] }) as const),
      abi: abi.allPendingTokens,
    }),
  ])

  const balances: MagpieBalance[] = mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], userPendingRewards[i]]),

    (res, index) => {
      const pool = pools[index]
      const rewards = pool.rewards as Balance[]
      const [{ output: userBalance }, { output: userRewards }] = res.inputOutputPairs

      const [stake] = userBalance
      const [pendingMGP, bonusTokenAddresses, _, pendingBonusRewards] = userRewards

      if (rewards.length > 0 && pendingMGP !== undefined) {
        rewards[0] = { ...rewards[0], amount: pendingMGP }
      }

      bonusTokenAddresses.forEach((bonusAddress: `0x${string}`, bonusIndex: number) => {
        const rewardIndex = rewards.findIndex(
          (reward, index) => index > 0 && reward.address.toLowerCase() === bonusAddress.toLowerCase(),
        )

        if (rewardIndex > 0 && pendingBonusRewards[bonusIndex] !== undefined) {
          rewards[rewardIndex] = { ...rewards[rewardIndex], amount: pendingBonusRewards[bonusIndex] }
        }
      })

      return {
        ...pool,
        amount: stake,
        underlyings: pool.underlyings as Contract[],
        rewards,
        category: 'farm',
        provider: pool.provider,
      }
    },
  )

  return Promise.all(
    balances.map(async (balance) => {
      const underlyingFunction = getUnderlyings[balance.provider] || ((_ctx, balances) => Promise.resolve(balances))
      return underlyingFunction(ctx, [balance])
    }),
  )
}

async function getRadpieUnderlyings(ctx: BalancesContext, pools: Balance[]): Promise<Balance[]> {
  const singleUnderlyingsPools = pools.filter((pool) => pool.underlyings!.length < 2)
  const multiUnderlyingsPools = pools.filter((pool) => pool.underlyings!.length > 1)

  const reserveRes = await multicall({
    ctx,
    calls: multiUnderlyingsPools.map((pool: Contract) => ({ target: pool.helper }) as const),
    abi: abi.getReserves,
  })

  const multiUnderlyingsBalances = mapSuccessFilter(reserveRes, (res, index) => {
    const pool = multiUnderlyingsPools[index]
    const underlyings = pool.underlyings as Contract[]
    const [token0Balance, token1Balance, totalSupply] = res.output

    if (!underlyings) return null

    const underlying0 = { ...underlyings[0], amount: (token0Balance * pool.amount) / totalSupply / parseEther('1.0') }
    const underlying1 = { ...underlyings[1], amount: (token1Balance * pool.amount) / totalSupply / parseEther('1.0') }

    return {
      ...pool,
      underlyings: [underlying0, underlying1],
    }
  }).filter(isNotNullish)

  return [...singleUnderlyingsPools, ...multiUnderlyingsBalances]
}
