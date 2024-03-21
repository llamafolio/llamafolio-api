import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  getWTAOByWstTAO: {
    inputs: [{ internalType: 'uint256', name: 'wstTaoAmount', type: 'uint256' }],
    name: 'getWTAOByWstTAO',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const wTAO: Contract = {
  chain: 'ethereum',
  address: '0x77E06c9eCCf2E797fd462A92B6D7642EF85b0A44',
  decimals: 9,
  symbol: 'wTAO',
}

export async function getTensorPlexBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userShare = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const userAsset = await call({ ctx, target: staker.address, params: [userShare], abi: abi.getWTAOByWstTAO })

  return {
    ...staker,
    amount: userShare,
    underlyings: [{ ...wTAO, amount: userAsset }],
    rewards: undefined,
    category: 'stake',
  }
}
