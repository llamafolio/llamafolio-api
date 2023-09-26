import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  getTokenBalance: {
    inputs: [{ internalType: 'uint8', name: 'index', type: 'uint8' }],
    name: 'getTokenBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getHopLpBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  return processBalances(
    ctx,
    mapSuccessFilter(userBalancesRes, (res, idx) => ({ ...pools[idx], amount: res.output, category: 'lp' })),
  )
}

export async function getHopFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, userPendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  for (const [index, farmer] of farmers.entries()) {
    const underlyings = farmer.underlyings as Contract[]
    const reward = farmer.rewards?.[0] as Contract
    const userBalanceRes = userBalancesRes[index]
    const userPendingRewardRes = userPendingRewardsRes[index]

    if (!underlyings || !reward || !userBalanceRes.success || !userPendingRewardRes.success) {
      continue
    }

    balances.push({
      ...farmer,
      amount: BigInt(Math.round(Number(userBalanceRes.output) * 0.8956326522751297)),
      underlyings,
      rewards: [{ ...reward, amount: userPendingRewardRes.output }],
      category: 'farm',
    })
  }

  return processBalances(ctx, balances)
}

export async function processBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [underlyings0BalancesRes, underlyings1BalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.lpToken, params: [0] }) as const),
      abi: abi.getTokenBalance,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.lpToken, params: [1] }) as const),
      abi: abi.getTokenBalance,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (const [index, pool] of pools.entries()) {
    const underlyings = pool.underlyings as Contract[]
    const amount = pool.amount
    const underlyings0BalanceRes = underlyings0BalancesRes[index]
    const underlyings1BalanceRes = underlyings1BalancesRes[index]
    const totalSupplyRes = totalSuppliesRes[index]

    if (
      !underlyings ||
      !underlyings0BalanceRes.success ||
      !underlyings1BalanceRes.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const underlyings0 = calculateUnderlyingAmount(underlyings[0], amount, underlyings0BalanceRes, totalSupplyRes)
    const underlyings1 = calculateUnderlyingAmount(underlyings[1], amount, underlyings1BalanceRes, totalSupplyRes)

    balances.push({
      ...pool,
      amount,
      underlyings: [underlyings0, underlyings1],
      rewards: pool.rewards as Balance[],
      category: pool.category!,
    })
  }

  return balances
}

function calculateUnderlyingAmount(
  underlying: Contract,
  userBalanceRes: any,
  underlyingBalanceRes: any,
  totalSupplyRes: any,
) {
  return { ...underlying, amount: (underlyingBalanceRes.output * userBalanceRes) / totalSupplyRes.output }
}
