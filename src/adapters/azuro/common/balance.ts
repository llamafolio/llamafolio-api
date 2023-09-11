import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  balanceOf: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  nodeWithdrawView: {
    inputs: [{ internalType: 'uint48', name: 'leaf', type: 'uint48' }],
    name: 'nodeWithdrawView',
    outputs: [{ internalType: 'uint128', name: 'withdrawAmount', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getAzuroLpBalances(ctx: BalancesContext, managers: Contract[]): Promise<Balance[]> {
  const userTokensIds = await multicall({
    ctx,
    calls: managers.map((manager) => ({ target: manager.address, params: [ctx.address] }) as const),
    abi: abi.balanceOf,
  })

  const tokenOfOwnerByIndex = await multicall({
    ctx,
    calls: mapSuccessFilter(userTokensIds, (res) =>
      rangeBI(0n, res.output).map((idx) => ({ target: res.input.target, params: [ctx.address, idx] }) as const),
    ).flat(),
    abi: abi.tokenOfOwnerByIndex,
  })

  const userBalances = await multicall({
    ctx,
    //@ts-expect-error
    calls: mapSuccessFilter(
      tokenOfOwnerByIndex,
      (res) => ({ target: res.input.target, params: [res.output] }) as const,
    ),
    abi: abi.nodeWithdrawView,
  })

  const balances: Balance[] = mapSuccessFilter(userBalances, (res) => {
    const associatedManager: any = managers.find((manager) => manager.address === res.input.target)

    return {
      ...associatedManager,
      amount: res.output,
      category: 'lp',
    }
  })

  return balances
}
