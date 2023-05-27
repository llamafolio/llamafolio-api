import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  balanceOfAssets: {
    inputs: [{ internalType: 'address', name: 'account_', type: 'address' }],
    name: 'balanceOfAssets',
    outputs: [{ internalType: 'uint256', name: 'balanceOfAssets_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getBalance: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  withdrawableFundsOf: {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    name: 'withdrawableFundsOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMapleSingleStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const balanceOfsRes = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.balanceOfAssets,
  })

  return {
    ...staker,
    amount: BigNumber.from(balanceOfsRes),
    underlyings: staker.underlyings as Contract[],
    rewards: undefined,
    category: 'stake',
  }
}

export async function getMapleStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof erc20Abi.balanceOf>[] = stakers.map((staker) => ({
    target: staker.staker,
    params: [ctx.address],
  }))

  const [balanceOfsRes, withdrawablesRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.withdrawableFundsOf }),
  ])

  const [underlyingsBalancesOfRes, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: stakers.flatMap((staker) =>
        staker.underlyings!.map(
          (underlying) => ({ target: staker.lpToken, params: [(underlying as Contract).address] } as const),
        ),
      ),
      abi: abi.getBalance,
    }),
    multicall({ ctx, calls: stakers.map((staker) => ({ target: staker.lpToken })), abi: erc20Abi.totalSupply }),
  ])

  for (let stakerIdx = 0; stakerIdx < stakers.length; stakerIdx++) {
    const staker = stakers[stakerIdx]
    const underlyings = staker.underlyings as Contract[]
    const reward = staker.rewards?.[0] as Contract
    const balanceOfRes = balanceOfsRes[stakerIdx]
    const withdrawableRes = withdrawablesRes[stakerIdx]
    const totalSupplyRes = totalSuppliesRes[stakerIdx]

    if (!underlyings || !balanceOfRes.success || !withdrawableRes.success || !totalSupplyRes.success) {
      continue
    }

    const balance: Balance = {
      ...staker,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings: [],
      rewards: [{ ...reward, amount: BigNumber.from(withdrawableRes.output) }],
      category: 'stake',
    }

    underlyings.forEach((underlying, idx) => {
      const underlyingBalancesOf = underlyingsBalancesOfRes[idx]

      const underlyingsBalanceOfRes = underlyingBalancesOf.success ? underlyingBalancesOf.output : BN_ZERO

      balance.underlyings?.push({
        ...underlying,
        amount: balance.amount.mul(underlyingsBalanceOfRes).div(totalSupplyRes.output),
      })
    })

    balances.push(balance)
  }

  return balances
}
