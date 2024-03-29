import type { BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { MAX_UINT_256 } from '@lib/math'

const abi = {
  getUserHealthFactor: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'address[]', name: '_updatedMarkets', type: 'address[]' },
    ],
    name: 'getUserHealthFactor',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getUserHealthFactor(
  ctx: BalancesContext,
  morphoLens: Contract,
  markets: Contract[],
): Promise<number | undefined> {
  const marketsAddresses = markets.map((res) => res.address)

  const userHealthFactorRes = await call({
    ctx,
    target: morphoLens.address,
    params: [ctx.address, marketsAddresses],
    abi: abi.getUserHealthFactor,
  })

  if (userHealthFactorRes === MAX_UINT_256) {
    return
  }

  return Number(userHealthFactorRes) / 1e18
}
