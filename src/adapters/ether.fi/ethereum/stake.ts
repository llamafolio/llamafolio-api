import { Balance, BalancesContext, Contract } from '@lib/adapter'
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
}

export async function getEtherBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const { output: userBalanceOf } = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.depositInfo,
  })

  return {
    ...staker,
    amount: BigNumber.from(userBalanceOf.etherBalance),
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}
