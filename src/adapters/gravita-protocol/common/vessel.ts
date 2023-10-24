import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getERC20Details } from '@lib/erc20'

const abi = {
  getAllCollateral: {
    inputs: [],
    name: 'getAllCollateral',
    outputs: [
      { internalType: 'address[]', name: '', type: 'address[]' },
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCollateralVessel(ctx: BaseContext, stabilityPool: Contract) {
  const [tokens, _liquidity] = await call({ ctx, target: stabilityPool.address, abi: abi.getAllCollateral })

  return getERC20Details(ctx, tokens) as Promise<Contract[]>
}
