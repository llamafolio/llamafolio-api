import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abi = {
  depositInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'depositInfo',
    outputs: [
      { internalType: 'uint256', name: 'depositTime', type: 'uint256' },
      { internalType: 'uint256', name: 'etherBalance', type: 'uint256' },
      { internalType: 'uint256', name: 'totalERC20Balance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getEtherBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const depositInfo = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.depositInfo,
  })

  const [_depositTime, etherBalance, _totalERC20Balance] = depositInfo

  return {
    ...staker,
    amount: BigNumber.from(etherBalance),
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}
