import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  pendingAtlantis: {
    constant: true,
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingAtlantis',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getAtlantisFarmBalances(
  ctx: BalancesContext,
  stakers: Contract[],
  atl: Token,
): Promise<Balance[]> {
  const balances: Balance[] = []
  const lpBalances: Balance[] = []

  const calls: Call[] = stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }))

  const [balancesOfsRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingAtlantis }),
  ])

  for (let idx = 0; idx < stakers.length; idx++) {
    const staker = stakers[idx]
    const underlyings = staker.underlyings as Contract[]
    const balancesOfRes = balancesOfsRes[idx]
    const pendingRewardRes = pendingRewardsRes[idx]

    if (isSuccess(balancesOfRes) && isSuccess(pendingRewardRes) && underlyings) {
      const lpToken = staker.lpToken
      const symbol = lpToken ? lpToken.symbol : underlyings[0].symbol
      const amount = BigNumber.from(balancesOfRes.output.amount)

      const balance: Balance = {
        ...staker,
        address: lpToken ? lpToken.address : staker.address,
        symbol,
        amount,
        decimals: 18,
        underlyings,
        rewards: [{ ...atl, amount: BigNumber.from(pendingRewardRes.output) }],
        category: 'farm',
      }

      if (balance.underlyings && balance.underlyings.length > 1) {
        lpBalances.push(balance)
      } else {
        balances.push(balance)
      }
    }
  }

  return [...balances, ...(await getUnderlyingBalances(ctx, lpBalances))]
}
