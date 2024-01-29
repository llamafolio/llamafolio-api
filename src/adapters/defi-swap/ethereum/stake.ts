import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  token: {
    constant: true,
    inputs: [],
    name: 'token',
    outputs: [{ name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getPersonalStakes: {
    constant: true,
    inputs: [{ name: '_address', type: 'address' }],
    name: 'getPersonalStakes',
    outputs: [
      { name: '', type: 'uint256[]' },
      { name: '', type: 'uint256[]' },
      { name: '', type: 'address[]' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getDefiStakers(ctx: BaseContext, stakerAddresses: `0x${string}`[]): Promise<Contract[]> {
  const assets = await multicall({
    ctx,
    calls: stakerAddresses.map((staker) => ({ target: staker }) as const),
    abi: abi.token,
  })

  return mapSuccessFilter(assets, (res) => ({ chain: ctx.chain, address: res.input.target, token: res.output }))
}

export async function getDefiStakersBalances(ctx: BalancesContext, stakers: Contract[]): Promise<Balance[]> {
  const userBalances = await multicall({
    ctx,
    calls: stakers.map((staker) => ({ target: staker.address, params: [ctx.address] }) as const),
    abi: abi.getPersonalStakes,
  })

  return mapSuccessFilter(userBalances, (res, index) => {
    const [_, amount] = res.output.flat() as bigint[]

    return {
      ...stakers[index],
      amount: amount ?? 0n,
      underlyings: undefined,
      rewards: undefined,
      category: 'stake',
    }
  })
}
