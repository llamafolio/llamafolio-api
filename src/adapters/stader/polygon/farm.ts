import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abi = {
  getUserMaticXSwapRequests: {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'getUserMaticXSwapRequests',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'requestTime', type: 'uint256' },
          { internalType: 'uint256', name: 'withdrawalTime', type: 'uint256' },
        ],
        internalType: 'struct IChildPool.MaticXSwapRequest[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getStaderFarmBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const { output: userBalance } = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.getUserMaticXSwapRequests,
  })

  return {
    ...contract,
    address: contract.token!,
    amount: BigNumber.from(userBalance[0].amount),
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }
}
