import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const USDC: Token = {
  chain: 'ethereum',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  decimals: 6,
  symbol: 'USDC',
}

export async function getCegaBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalancesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
    abi: erc20Abi.balanceOf,
  })

  const fmtBalancesRes = await multicall({
    ctx,
    calls: userBalancesRes.map((userBalance) =>
      isSuccess(userBalance) ? { target: userBalance.input.target, params: [userBalance.output] } : null,
    ),
    abi: abi.convertToAssets,
  })

  const balances: Balance[] = mapSuccessFilter(fmtBalancesRes, (res) => ({
    chain: ctx.chain,
    decimals: USDC.decimals,
    address: res.input.target,
    amount: BigNumber.from(res.output),
    underlyings: [USDC],
    rewards: undefined,
    category: 'farm',
  }))

  return balances
}
