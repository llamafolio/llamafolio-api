import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const OUSD: Token = {
  chain: 'ethereum',
  address: '0x2A8e1E676Ec238d8A992307B495b45B3fEAa5e86',
  symbol: 'OUSD',
  decimals: 18,
}

export async function getOriginDollarStakerBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const balanceOfRes = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const convertRateRes = await call({
    ctx,
    target: staker.address,
    params: [balanceOfRes],
    abi: abi.convertToAssets,
  })

  return {
    ...staker,
    amount: convertRateRes,
    underlyings: [OUSD],
    rewards: undefined,
    category: 'stake',
  }
}
