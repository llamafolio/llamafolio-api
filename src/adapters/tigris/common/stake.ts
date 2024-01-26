import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  userStaked: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userStaked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pending: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'address', name: '_token', type: 'address' },
    ],
    name: 'pending',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const tigUSD_arb: Contract = {
  chain: 'arbitrum',
  address: '0x7e491f53bf807f836e2dd6c4a4fbd193e1913efd',
  decimals: 18,
  symbol: 'tigUSD',
}

const tigUSD_poly: Contract = {
  chain: 'polygon',
  address: '0x76973ba2aff24f87ffe41fdbfd15308debb8f7e8',
  decimals: 18,
  symbol: 'tigUSD',
}

const tigUSD: { [key: string]: Contract } = {
  arbitrum: tigUSD_arb,
  polygon: tigUSD_poly,
}

export async function getTigrisStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, userReward] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.userStaked }),
    call({ ctx, target: staker.address, params: [ctx.address, tigUSD[ctx.chain].address], abi: abi.pending }),
  ])

  return {
    ...staker,
    amount: userBalance,
    underlyings: undefined,
    rewards: [{ ...tigUSD[ctx.chain], amount: userReward }],
    category: 'stake',
  }
}
