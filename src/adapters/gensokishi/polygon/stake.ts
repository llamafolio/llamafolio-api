import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const MV: Token = {
  chain: 'polygon',
  address: '0xa3c322ad15218fbfaed26ba7f616249f7705d945',
  decimals: 18,
  symbol: 'MV',
}

const ROND: Token = {
  chain: 'polygon',
  address: '0x204820b6e6feae805e376d2c6837446186e57981',
  decimals: 18,
  symbol: 'ROND',
}

export async function getGensokishiStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, earned] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.earned }),
  ])

  return {
    ...staker,
    amount: userBalance,
    underlyings: [MV],
    rewards: [{ ...ROND, amount: earned }],
    category: 'stake',
  }
}
