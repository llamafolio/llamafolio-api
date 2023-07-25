import { getLendingPoolBalances } from '@lib/aave/v2/lending'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  get_underlying_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[8]' }],
  },
} as const

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getSturdyBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const singleUnderlyings: Balance[] = []
  const multipleUnderlyings: Balance[] = []

  const poolBalances = await getLendingPoolBalances(ctx, pools)

  for (const poolBalance of poolBalances) {
    const underlyings = poolBalance.underlyings

    if (underlyings && underlyings.length > 1) {
      multipleUnderlyings.push(poolBalance)
      continue
    }
    singleUnderlyings.push(poolBalance)
  }

  return [...singleUnderlyings, ...(await underlyingsBalances(ctx, multipleUnderlyings))]
}

const underlyingsBalances = async (ctx: BalancesContext, pools: Balance[]): Promise<Balance[]> => {
  const [totalSuppliesRes, underlyingsBalancesInPoolsRes] = await Promise.all([
    multicall({ ctx, calls: pools.map((pool: Contract) => ({ target: pool.lpToken })), abi: erc20Abi.totalSupply }),
    multicall({
      ctx,
      calls: pools.map((pool: Contract) => ({ target: metaRegistry.address, params: [pool.poolAddress] }) as const),
      abi: abi.get_underlying_balances,
    }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const { underlyings, amount } = pool
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    const underlyingsBalanceRes = underlyingsBalancesInPoolsRes[poolIdx]

    if (!underlyings || !underlyingsBalanceRes.success || !totalSupplyRes.success || totalSupplyRes.output === 0n) {
      continue
    }

    underlyings.forEach((underlying, underlyingIdx) => {
      const underlyingBalance = underlyingsBalanceRes.output[underlyingIdx]
      ;(underlying as Balance).amount = (underlyingBalance * amount) / totalSupplyRes.output
    })
  }

  return pools
}
