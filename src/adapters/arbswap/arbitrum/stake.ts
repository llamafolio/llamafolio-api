import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { parseEther } from 'viem'

const abi = {
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ARBS: Contract = {
  chain: 'arbitrum',
  address: '0xf50874f8246776ca4b89eef471e718f70f38458f',
  decimals: 18,
  symbol: 'ARBS',
}

export async function getArbsStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userShare, pricePerShare] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: abi.getPricePerFullShare }),
  ])

  return {
    ...staker,
    amount: userShare,
    underlyings: [{ ...ARBS, amount: (userShare * pricePerShare) / parseEther('1.0') }],
    rewards: undefined,
    category: 'stake',
  }
}
