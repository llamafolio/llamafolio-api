import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi, getBalancesOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getUnderlyingBalances: {
    inputs: [],
    name: 'getUnderlyingBalances',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount0Current',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount1Current',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  claimable_reward: {
    stateMutability: 'view',
    type: 'function',
    name: 'claimable_reward',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_reward_token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 26593,
  },
  totalUnderlyingWithFees: {
    inputs: [{ internalType: 'contract IArrakisV2', name: 'vault_', type: 'address' }],
    name: 'totalUnderlyingWithFees',
    outputs: [
      { internalType: 'uint256', name: 'amount0', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1', type: 'uint256' },
      { internalType: 'uint256', name: 'fee0', type: 'uint256' },
      { internalType: 'uint256', name: 'fee1', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLpBalances(ctx: BalancesContext, contracts: Contract[]) {
  const balances: Balance[] = []

  const balancesRaw = (await getBalancesOf(ctx, contracts as Token[])).filter((balance) => balance.amount > 0n)

  const calls = balancesRaw.map((balance) => ({
    target: balance.address,
  }))

  const [underlyingBalancesRes, totalSupplyRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getUnderlyingBalances }),
    multicall({ ctx, calls, abi: erc20Abi.totalSupply }),
  ])

  for (let i = 0; i < calls.length; i++) {
    const underlyingBalances = underlyingBalancesRes[i]
    const totalSupply = totalSupplyRes[i]

    if (!underlyingBalances.success || !totalSupply.success) {
      continue
    }

    const [amount0Current, amount1Current] = underlyingBalances.output
    ;(balancesRaw[i].underlyings![0] as Balance).amount = (balancesRaw[i].amount * amount0Current) / totalSupply.output
    ;(balancesRaw[i].underlyings![1] as Balance).amount = (balancesRaw[i].amount * amount1Current) / totalSupply.output

    balancesRaw[i].category = 'lp'
    balances.push(balancesRaw[i])
  }

  return balances
}

export async function getArrakisV1FarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, underlyingBalancesRes, totalSuppliesRes, userPendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.token! }) as const),
      abi: abi.getUnderlyingBalances,
    }),
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: farmers.flatMap((farmer) =>
        farmer.rewards!.map(
          (reward) => ({ target: farmer.address, params: [ctx.address, (reward as Contract).address] }) as const,
        ),
      ),
      abi: abi.claimable_reward,
    }),
  ])

  let rewardGlobalIndex = 0

  for (const [index, farmer] of farmers.entries()) {
    const underlyings = farmer.underlyings as Contract[]
    const userBalanceRes = userBalancesRes[index]
    const underlyingBalances = underlyingBalancesRes[index]
    const totalSupplyRes = totalSuppliesRes[index]

    if (
      !underlyings ||
      !userBalanceRes.success ||
      !underlyingBalances.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const rewardsMapped: any[] = []

    if (farmer.rewards) {
      for (const reward of farmer.rewards as Contract[]) {
        const userPendingReward = userPendingRewardsRes[rewardGlobalIndex]

        if (userPendingReward && userPendingReward.success) {
          rewardsMapped.push({
            ...reward,
            amount: userPendingReward.output,
          })
        }

        rewardGlobalIndex++
      }
    }

    const [amount0Current, amount1Current] = underlyingBalances.output
    const underlyings0 = { ...underlyings[0], amount: (userBalanceRes.output * amount0Current) / totalSupplyRes.output }
    const underlyings1 = { ...underlyings[1], amount: (userBalanceRes.output * amount1Current) / totalSupplyRes.output }

    balances.push({
      ...farmer,
      amount: userBalanceRes.output,
      underlyings: [underlyings0, underlyings1],
      rewards: rewardsMapped.length ? rewardsMapped : undefined,
      category: 'farm',
    })
  }

  return balances
}

export async function getArrakisV2FarmBalances(
  ctx: BalancesContext,
  farmers: Contract[],
  helper: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, totalSuppliesRes, userPendingRewardsRes, underlyingBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: farmers.flatMap((farmer) =>
        farmer.rewards!.map(
          (reward) => ({ target: farmer.address, params: [ctx.address, (reward as Contract).address] }) as const,
        ),
      ),
      abi: abi.claimable_reward,
    }),
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: helper.address, params: [farmer.token!] }) as const),
      abi: abi.totalUnderlyingWithFees,
    }),
  ])

  let rewardGlobalIndex = 0

  for (const [index, farmer] of farmers.entries()) {
    const underlyings = farmer.underlyings as Contract[]
    const userBalanceRes = userBalancesRes[index]
    const underlyingBalances = underlyingBalancesRes[index]
    const totalSupplyRes = totalSuppliesRes[index]

    if (
      !underlyings ||
      !userBalanceRes.success ||
      !underlyingBalances.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const rewardsMapped: any[] = []

    if (farmer.rewards) {
      for (const reward of farmer.rewards as Contract[]) {
        const userPendingReward = userPendingRewardsRes[rewardGlobalIndex]

        if (userPendingReward && userPendingReward.success) {
          rewardsMapped.push({
            ...reward,
            amount: userPendingReward.output,
          })
        }

        rewardGlobalIndex++
      }
    }

    const [amount0Current, amount1Current] = underlyingBalances.output
    const underlyings0 = { ...underlyings[0], amount: (userBalanceRes.output * amount0Current) / totalSupplyRes.output }
    const underlyings1 = { ...underlyings[1], amount: (userBalanceRes.output * amount1Current) / totalSupplyRes.output }

    balances.push({
      ...farmer,
      amount: userBalanceRes.output,
      underlyings: [underlyings0, underlyings1],
      rewards: rewardsMapped.length ? rewardsMapped : undefined,
      category: 'farm',
    })
  }

  return balances
}
