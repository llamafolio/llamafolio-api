import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getSingleStakeBalance } from '@lib/stake'
import { BigNumber } from 'ethers'

const abi = {
  getBalance: {
    inputs: [{ internalType: 'uint256', name: 'tid', type: 'uint256' }],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSmoothyStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance | undefined> {
  const balance = await getSingleStakeBalance(ctx, staker)
  return getSmoothyUnderlyingsBalances(ctx, balance)
}

const getSmoothyUnderlyingsBalances = async (ctx: BalancesContext, staker: Balance): Promise<Balance | undefined> => {
  const underlyings = staker.underlyings
  if (!underlyings) {
    return
  }

  const [tokensBalancesRes, totalSupply] = await Promise.all([
    multicall({
      ctx,
      calls: underlyings.map((_, idx) => ({ target: staker.address, params: [BigInt(idx)] } as const)),
      abi: abi.getBalance,
    }),
    call({ ctx, target: staker.address, abi: erc20Abi.totalSupply }),
  ])

  const fmtUnderlyings = mapSuccessFilter(tokensBalancesRes, (res, idx) => ({
    ...underlyings[idx],
    decimals: 18,
    amount: BigNumber.from(res.output).mul(staker.amount).div(totalSupply),
  }))

  return {
    ...staker,
    underlyings: fmtUnderlyings,
  }
}
