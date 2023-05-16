import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abi = {
  getUserRequestStatus: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'uint256', name: '_idx', type: 'uint256' },
    ],
    name: 'getUserRequestStatus',
    outputs: [
      { internalType: 'bool', name: '_isClaimable', type: 'bool' },
      { internalType: 'uint256', name: '_amount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getStaderFarmBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const { output: userBalance } = await call({
    ctx,
    target: contract.address,
    params: [ctx.address, 0],
    abi: abi.getUserRequestStatus,
  })

  return {
    ...contract,
    address: contract.token!,
    amount: BigNumber.from(userBalance._amount),
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }
}
