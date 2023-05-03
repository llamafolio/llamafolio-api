import type { BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { ethers } from 'ethers'

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
}
export async function getUserHealthFactor(
  ctx: BalancesContext,
  morphoLens: Contract,
  markets: Contract[],
): Promise<number | undefined> {
  const marketsAddresses: string[] = markets.map((res) => res.address)

  const userHealthFactorRes = await call({
    ctx,
    target: morphoLens.address,
    //@ts-ignore
    params: [ctx.address, marketsAddresses],
    abi: abi.getUserHealthFactor,
  })

  if (ethers.constants.MaxUint256.eq(userHealthFactorRes.output)) {
    return
  }

  return userHealthFactorRes.output / 1e18
}
