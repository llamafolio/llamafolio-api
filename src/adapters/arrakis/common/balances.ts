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
} as const

export async function getLpBalances(ctx: BalancesContext, contracts: Contract[]) {
  const balances: Balance[] = []

  const balancesRaw = await getBalancesOf(ctx, contracts as Token[])

  const nonZeroBalances = balancesRaw.filter((balance) => balance.amount > 0n)

  const calls = nonZeroBalances.map((balance) => ({
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

    ;(nonZeroBalances[i].underlyings![0] as Balance).amount =
      (nonZeroBalances[i].amount * amount0Current) / totalSupply.output
    ;(nonZeroBalances[i].underlyings![1] as Balance).amount =
      (nonZeroBalances[i].amount * amount1Current) / totalSupply.output

    nonZeroBalances[i].category = 'lp'
    balances.push(nonZeroBalances[i])
  }

  return balances
}

export async function getArrakisFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, underlyingBalancesRes, totalSuppliesRes] = await Promise.all([
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
  ])

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

    const [amount0Current, amount1Current] = underlyingBalances.output

    const underlyings0 = { ...underlyings[0], amount: (userBalanceRes.output * amount0Current) / totalSupplyRes.output }
    const underlyings1 = { ...underlyings[1], amount: (userBalanceRes.output * amount1Current) / totalSupplyRes.output }

    balances.push({
      ...farmer,
      amount: userBalanceRes.output,
      underlyings: [underlyings0, underlyings1],
      rewards: undefined,
      category: 'farm',
    })
  }

  return balances
}
