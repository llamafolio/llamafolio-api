import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { groupBy, mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  getBalance: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const balancerProvider = async (ctx: BalancesContext, pools: Balance[]): Promise<Balance[]> => {
  const balances: Balance[] = []

  const calls: Call<typeof abi.getBalance>[] = pools.flatMap((pool) =>
    pool.underlyings!.map((underlying) => ({ target: pool.address, params: [underlying.address] })),
  )

  const [tokensBalancesRes, poolSuppliesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getBalance }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: erc20Abi.totalSupply }),
  ])

  const balancesByAddresses = groupBy(
    mapSuccessFilter(tokensBalancesRes, (res) => ({
      address: res.input.target,
      token: res.input.params,
      output: res.output,
    })),
    'address',
  )

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const poolSupplyRes = poolSuppliesRes[poolIdx]

    if (!underlyings || !poolSupplyRes.success) {
      continue
    }

    const fmtUnderlyings = balancesByAddresses[pool.address].map((res, idx) => {
      const amount = BigNumber.from(res.output).mul(pool.amount).div(poolSupplyRes.output)

      return {
        ...underlyings[idx],
        amount,
      }
    })

    balances.push({ ...pool, underlyings: fmtUnderlyings })
  }

  return balances
}
