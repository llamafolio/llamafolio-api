import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getAccountsOwnedBy: {
    inputs: [{ internalType: 'address', name: '_owner', type: 'address' }],
    name: 'getAccountsOwnedBy',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  positions: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'positions',
    outputs: [
      {
        components: [
          { internalType: 'uint64', name: 'id', type: 'uint64' },
          { internalType: 'uint64', name: 'lastFundingIndex', type: 'uint64' },
          { internalType: 'uint128', name: 'margin', type: 'uint128' },
          { internalType: 'uint128', name: 'lastPrice', type: 'uint128' },
          { internalType: 'int128', name: 'size', type: 'int128' },
        ],
        internalType: 'struct IPerpsV2MarketBaseTypes.Position',
        name: '',
        type: 'tuple',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getKwentaDepositBalances(ctx: BalancesContext, factory: Contract): Promise<Balance[]> {
  const vaults = factory.vaults as Contract[]

  const [userAccount] = await call({ ctx, target: factory.address, params: [ctx.address], abi: abi.getAccountsOwnedBy })

  const userPositions = await multicall({
    ctx,
    calls: vaults.map((vault: Contract) => ({ target: vault.address, params: [userAccount] }) as const),
    abi: abi.positions,
  })

  return mapSuccessFilter(userPositions, (res, idx) => {
    const { margin } = res.output

    return {
      ...vaults[idx],
      amount: margin,
      underlyings: undefined,
      rewards: undefined,
      category: 'stake',
    }
  })
}
