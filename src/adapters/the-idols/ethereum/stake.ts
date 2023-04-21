import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  getUserVirtueStake: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUserVirtueStake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPendingETHGain: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getPendingETHGain',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  symbol: 'WETH',
  decimals: 18,
}

export async function getVirtueStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [{ output: userBalance }, { output: userPendingReward }, { output: userExtraReward }] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getUserVirtueStake }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getPendingETHGain }),
    call({ ctx, target: staker.rewarder, params: [ctx.address], abi: abi.earned }),
  ])

  return {
    ...staker,
    address: staker.token as string,
    amount: BigNumber.from(userBalance),
    underlyings: undefined,
    rewards: [{ ...WETH, amount: BigNumber.from(userPendingReward).add(userExtraReward) }],
    category: 'stake',
  }
}
