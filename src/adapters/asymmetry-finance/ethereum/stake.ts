import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { parseFloatBI } from '@lib/math'

const abi = {
  approxPrice: {
    inputs: [{ internalType: 'bool', name: '_validate', type: 'bool' }],
    name: 'approxPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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

export async function getsafETHBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userShare, pricePerFullShare] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [true], abi: abi.approxPrice }),
  ])

  const userAsset = Number(userShare) * parseFloatBI(pricePerFullShare, 18)

  return {
    ...staker,
    amount: userShare,
    underlyings: [{ ...WETH, amount: BigInt(userAsset) }],
    rewards: undefined,
    category: 'stake',
  }
}
