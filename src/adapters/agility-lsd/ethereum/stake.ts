import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const AGI: Token = {
  chain: 'ethereum',
  address: '0x5F18ea482ad5cc6BC65803817C99f477043DcE85',
  decimals: 18,
  symbol: 'AGI',
}

export async function getAgilityStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []
  const fmtUniBalances: Balance[] = []

  const calls: Call<typeof abi.earned>[] = stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }))

  const [userBalancesRes, earnedsRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  for (let stakeIdx = 0; stakeIdx < stakers.length; stakeIdx++) {
    const staker = stakers[stakeIdx]
    const userBalanceRes = userBalancesRes[stakeIdx]
    const earnedRes = earnedsRes[stakeIdx]

    if (!userBalanceRes.success) {
      continue
    }

    const balance: Balance = {
      ...staker,
      amount: userBalanceRes.output,
      underlyings: staker.underlyings as Contract[],
      rewards: earnedRes.success ? [{ ...AGI, amount: earnedsRes[stakeIdx].output || 0n }] : undefined,
      category: 'stake',
    }

    if (balance.underlyings && balance.underlyings.length > 1 && balance.token) {
      fmtUniBalances.push({ ...balance, address: balance.token })
      continue
    }

    balances.push(balance)
  }

  return [...balances, ...(await getUnderlyingBalances(ctx, fmtUniBalances))]
}
