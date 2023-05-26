import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  getStake: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getStake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getBaseReward: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getBaseReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const link: Token = {
  chain: 'ethereum',
  address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  decimals: 18,
  symbol: 'LINK',
}

export async function getChainlinkStakerBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [balanceOf, rewardsOf] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getStake }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getBaseReward }),
  ])

  return {
    ...staker,
    amount: BigNumber.from(balanceOf),
    decimals: link.decimals,
    symbol: link.symbol,
    underlyings: staker.underlyings as Contract[],
    rewards: [{ ...link, amount: BigNumber.from(rewardsOf) }],
    category: 'stake',
  }
}
