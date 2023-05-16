import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  lockedBalance: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'lockedBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  checkReward: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'checkReward',
    outputs: [{ internalType: 'uint256', name: 'rewards', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const TORN: Token = {
  chain: 'ethereum',
  address: '0x77777FeDdddFfC19Ff86DB637967013e6C6A116C',
  decimals: 18,
  symbol: 'TORN',
}

export async function getTornadoStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [{ output: userBalance }, { output: pendingReward }] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.lockedBalance }),
    call({ ctx, target: staker.rewarder, params: [ctx.address], abi: abi.checkReward }),
  ])

  return {
    ...staker,
    amount: BigNumber.from(userBalance),
    underlyings: undefined,
    rewards: [{ ...TORN, amount: BigNumber.from(pendingReward) }],
    category: 'stake',
  }
}
