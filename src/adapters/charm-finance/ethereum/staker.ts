import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getTotalAmounts: {
    inputs: [],
    name: 'getTotalAmounts',
    outputs: [
      { internalType: 'uint256', name: 'total0', type: 'uint256' },
      { internalType: 'uint256', name: 'total1', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getCharmStakeBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }))

  const [balanceOfsRes, totalAmountsRes, totalSuppliesRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: stakers.map((staker) => ({ target: staker.address })), abi: abi.getTotalAmounts }),
    multicall({ ctx, calls: stakers.map((staker) => ({ target: staker.address })), abi: erc20Abi.totalSupply }),
  ])

  for (let stakeIdx = 0; stakeIdx < stakers.length; stakeIdx++) {
    const staker = stakers[stakeIdx]
    const underlyings = staker.underlyings as Contract[]
    const balanceOfRes = balanceOfsRes[stakeIdx]
    const totalAmountRes = totalAmountsRes[stakeIdx]
    const totalSupplyRes = totalSuppliesRes[stakeIdx]

    if (
      !underlyings ||
      !isSuccess(balanceOfRes) ||
      !isSuccess(totalAmountRes) ||
      !isSuccess(totalSupplyRes) ||
      isZero(totalSupplyRes.output)
    ) {
      continue
    }

    const updateUnderlyings = underlyings.map((underlying, idx) => ({
      ...underlying,
      amount: BigNumber.from(balanceOfRes.output).mul(totalAmountRes.output[idx]).div(totalSupplyRes.output),
    }))

    balances.push({
      ...staker,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings: updateUnderlyings,
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}
