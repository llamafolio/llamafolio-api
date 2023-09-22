import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  balanceOfUnderlying: {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    name: 'balanceOfUnderlying',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getLiquidBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userStakeBalances, underlyingsBalances] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.balanceOfUnderlying }),
  ])

  return {
    ...staker,
    amount: userStakeBalances,
    underlyings: [{ ...WETH, amount: underlyingsBalances }],
    rewards: undefined,
    category: 'stake',
  }
}
