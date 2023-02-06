import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers/lib/ethers'

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
}

export interface getBalancerPoolsBalancesParams extends Balance {
  totalSupply: BigNumber
}

export async function getBalancerPoolsBalances(ctx: BalancesContext, pools: Contract[], vault: Contract) {
  const balances: getBalancerPoolsBalancesParams[] = []

  const calls: Call[] = []
  const suppliesCalls: Call[] = []
  const poolTokensBalancesCalls: Call[] = []

  for (const pool of pools) {
    calls.push({ target: pool.gauge, params: [ctx.address] })
    suppliesCalls.push({ target: pool.gauge, params: [] })
    poolTokensBalancesCalls.push({ target: vault.address, params: [pool.id] })
  }

  const [balanceOfsRes, totalSuppliesRes, poolTokensBalancesRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: suppliesCalls, abi: erc20Abi.totalSupply }),
    multicall({ ctx, calls: poolTokensBalancesCalls, abi: abi.getPoolTokens }),
  ])

  for (let idx = 0; idx < pools.length; idx++) {
    const pool = pools[idx]
    const underlyings = pool.underlyings as Contract[]
    const balanceOfRes = balanceOfsRes[idx]
    const totalSupplyRes = totalSuppliesRes[idx]
    const poolTokenBalanceRes = poolTokensBalancesRes[idx]

    if (
      !underlyings ||
      !isSuccess(balanceOfRes) ||
      !isSuccess(totalSupplyRes) ||
      !isSuccess(poolTokenBalanceRes) ||
      isZero(totalSupplyRes.output)
    ) {
      continue
    }

    const balance: getBalancerPoolsBalancesParams = {
      ...pool,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings,
      rewards: undefined,
      totalSupply: BigNumber.from(totalSupplyRes.output),
      category: 'farm',
    }

    for (let underlyingIdx = 0; underlyingIdx < balance.underlyings!.length; underlyingIdx++) {
      const underlying = balance.underlyings![underlyingIdx]
      const underlyingsBalanceOf = poolTokenBalanceRes.output.balances[underlyingIdx]

      const underlyingAmount = balance.amount.mul(underlyingsBalanceOf).div(balance.totalSupply)

      balance.underlyings![underlyingIdx] = { ...underlying, amount: underlyingAmount }
    }

    balances.push(balance)
  }

  return balances
}
