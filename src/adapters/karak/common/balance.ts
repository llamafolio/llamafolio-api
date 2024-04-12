import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { isNotNullish } from '@lib/type'

const abi = {
  getDeposits: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getDeposits',
    outputs: [
      { internalType: 'contract IVault[]', name: 'vaults', type: 'address[]' },
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'assets', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'shares', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getKarakStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const underlyings = staker.underlyings as Contract[]
  if (!underlyings) return []

  const [_vaults, tokens, assets, _shares] = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.getDeposits,
  })

  return tokens
    .map((token, index) => {
      const amount = assets[index]
      const underlying = underlyings.find((underlying) => underlying.address.toLowerCase() === token.toLowerCase())
      if (!underlying) return null

      return {
        ...underlying,
        amount,
        underlyings: undefined,
        rewards: undefined,
        category: 'stake' as Category,
      }
    })
    .filter(isNotNullish)
}
