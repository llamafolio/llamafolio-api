import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  getClaimable: {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getClaimable',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const SONNE: Token = {
  chain: 'optimism',
  address: '0x1db2466d9f5e10d7090e7152b68d62703a2245f0',
  decimals: 18,
  symbol: 'SONNE',
}

export async function getSonneStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [{ output: balanceOfRes }, { output: claimableRewardRes }] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [SONNE.address, ctx.address], abi: abi.getClaimable }),
  ])

  return {
    ...staker,
    amount: BigNumber.from(balanceOfRes),
    underlyings: [SONNE],
    rewards: [{ ...SONNE, amount: BigNumber.from(claimableRewardRes) }],
    category: 'stake',
  }
}
