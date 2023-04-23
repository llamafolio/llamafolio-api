import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const AGI: Token = {
  chain: 'ethereum',
  address: '0x5F18ea482ad5cc6BC65803817C99f477043DcE85',
  decimals: 18,
  symbol: 'AGI',
}

export async function getAgilityStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []
  const fmtUniBalances: Balance[] = []

  const calls: Call[] = stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }))

  const [userBalancesRes, earnedsRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  for (let stakeIdx = 0; stakeIdx < stakers.length; stakeIdx++) {
    const staker = stakers[stakeIdx]
    const userBalanceRes = userBalancesRes[stakeIdx]
    const earnedRes = earnedsRes[stakeIdx]

    if (!isSuccess(userBalanceRes)) {
      continue
    }

    const balance: Balance = {
      ...staker,
      amount: BigNumber.from(userBalanceRes.output),
      underlyings: staker.underlyings as Contract[],
      rewards: isSuccess(earnedRes) ? [{ ...AGI, amount: BigNumber.from(earnedsRes[stakeIdx].output) }] : undefined,
      category: 'stake',
    }

    if (balance.underlyings && balance.underlyings.length > 1) {
      fmtUniBalances.push({ ...balance, address: balance.token as string })
      continue
    }

    balances.push(balance)
  }

  return [...balances, ...(await getUnderlyingBalances(ctx, fmtUniBalances))]
}
