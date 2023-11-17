import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  calculateTokenAmount: {
    inputs: [{ internalType: 'uint256', name: 'vTokenAmount', type: 'uint256' }],
    name: 'calculateTokenAmount',
    outputs: [{ internalType: 'uint256', name: 'tokenAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getBifrostBalances(
  ctx: BalancesContext,
  stakers: Contract[],
  converter: Contract,
): Promise<Balance[]> {
  const vTokensBalanceOfs = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  const tokenBalancesOfs = await multicall({
    ctx,
    calls: mapSuccessFilter(vTokensBalanceOfs, (res) => ({ target: converter.address, params: [res.output] }) as const),
    abi: abi.calculateTokenAmount,
  })

  return mapSuccessFilter(tokenBalancesOfs, (res, index) => ({
    ...stakers[index],
    amount: res.input.params[0],
    underlyings: [{ ...WETH, amount: res.output }],
    rewards: undefined,
    category: 'stake',
  }))
}
