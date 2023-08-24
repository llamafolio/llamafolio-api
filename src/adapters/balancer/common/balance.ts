import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { ADDRESS_ZERO } from '@lib/contract'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBalancesBalances(
  ctx: BalancesContext,
  pools: Contract[],
  vault: Contract,
): Promise<Balance[][]> {
  return Promise.all([
    getBalancerBalancesInternal(ctx, pools, vault, 'lp', 'address'),
    getBalancerBalancesInternal(ctx, pools, vault, 'farm', 'gauge'),
  ])
}

async function getBalancerBalancesInternal(
  ctx: BalancesContext,
  inputPools: Contract[],
  vault: Contract,
  category: 'lp' | 'farm',
  targetProp: 'address' | 'gauge',
): Promise<Balance[]> {
  const balances: Balance[] = []

  // Duplicate pools based on gauges
  let pools: Contract[] = []
  inputPools.forEach((pool) => {
    if (targetProp === 'gauge' && Array.isArray(pool.gauge)) {
      pool.gauge.forEach((gauge) => {
        pools.push({ ...pool, gauge: gauge })
      })
    } else {
      pools.push(pool)
    }
  })

  if (category === 'farm') {
    pools = pools.filter((pool) => pool.gauge !== undefined && pool.gauge !== ADDRESS_ZERO)
  }

  const [poolBalancesRes, uBalancesRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool[targetProp], params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: vault.address, params: [pool.poolId] }) as const),
      abi: abi.getPoolTokens,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: erc20Abi.totalSupply,
    }),
  ])

  for (const [index, pool] of pools.entries()) {
    const underlyings = pool.underlyings as Contract[]
    const rewards = pool.rewards as Balance[]
    const poolBalanceRes = poolBalancesRes[index]
    const uBalanceRes = uBalancesRes[index]
    const totalSupplyRes = totalSuppliesRes[index]

    if (
      !underlyings ||
      !poolBalanceRes.success ||
      !uBalanceRes.success ||
      !totalSupplyRes.success ||
      totalSupplyRes.output === 0n
    ) {
      continue
    }

    const [_tokens, underlyingsBalances] = uBalanceRes.output

    underlyings.forEach((underlying, idx) => {
      const amount = underlyingsBalances[idx]
      underlying.amount = amount
    })

    const lpTokenBalance = underlyings.find(
      (underlying) => underlying.address.toLowerCase() === pool.address.toLowerCase(),
    )

    const fmtUnderlyings = underlyings
      .map((underlying) => {
        const realSupply = lpTokenBalance ? totalSupplyRes.output - lpTokenBalance.amount : totalSupplyRes.output
        const amount = (underlying.amount * poolBalanceRes.output) / realSupply

        return {
          ...underlying,
          amount,
        }
      })
      .filter((underlying) => underlying.address.toLowerCase() !== pool.address.toLowerCase())

    balances.push({ ...pool, amount: poolBalanceRes.output, underlyings: fmtUnderlyings, rewards, category })
  }

  return balances
}
