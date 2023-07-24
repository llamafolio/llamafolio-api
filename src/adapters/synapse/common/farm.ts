import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingSynapse: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingSynapse',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getTokenBalance: {
    inputs: [{ internalType: 'uint8', name: 'index', type: 'uint8' }],
    name: 'getTokenBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type getSynapseBalancesParams = Balance & {
  totalSupply: bigint
  pool: `0x${string}`
}

export async function getSynapseBalances(
  ctx: BalancesContext,
  pools: Contract[],
  miniChef: Contract,
): Promise<Balance[]> {
  const balances: getSynapseBalancesParams[] = []

  const calls: Call<typeof abi.userInfo>[] = []
  const totalSuppliesCalls: Call<typeof erc20Abi.totalSupply>[] = []
  for (const pool of pools) {
    calls.push({ target: miniChef.address, params: [pool.pid, ctx.address] })
    totalSuppliesCalls.push({ target: pool.address })
  }

  const [userInfosRes, pendingSynapsesRes, totalSuppliesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingSynapse }),
    multicall({ ctx, calls: totalSuppliesCalls, abi: erc20Abi.totalSupply }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards?.[0] as Contract
    const userInfoRes = userInfosRes[poolIdx]
    const pendingSynapseRes = pendingSynapsesRes[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!userInfoRes.success || !pendingSynapseRes.success || !totalSupplyRes.success) {
      continue
    }

    const [amount] = userInfoRes.output

    balances.push({
      ...pool,
      pool: pool.pool,
      amount: amount,
      underlyings: underlyings,
      rewards: [{ ...rewards, amount: pendingSynapseRes.output }],
      totalSupply: totalSupplyRes.output,
      category: 'farm',
    })
  }

  return getUnderlyingsBalances(ctx, balances)
}

async function getUnderlyingsBalances(ctx: BalancesContext, balances: getSynapseBalancesParams[]): Promise<Balance[]> {
  for (const balance of balances) {
    const { pool, underlyings, amount } = balance

    if (!underlyings || amount <= 0n) {
      continue
    }

    const underlyingsBalancesRes = await multicall({
      ctx,
      calls: underlyings.map((_, i) => ({ target: pool, params: [i] }) as const),
      abi: abi.getTokenBalance,
    })

    underlyings.map((underlying, underlyingIdx) => {
      const underlyingsBalance = underlyingsBalancesRes[underlyingIdx]

      if (underlyingsBalance.success) {
        ;(underlying as Balance).amount = (underlyingsBalance.output * balance.amount) / balance.totalSupply
      }
    })
  }

  return balances
}
