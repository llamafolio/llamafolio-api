import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  end_time: {
    name: 'end_time',
    outputs: [
      {
        type: 'uint256',
        name: '',
      },
    ],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 1661,
  },
} as const

export async function getStakeDaoVestBalances(ctx: BalancesContext, vesters: Contract[]): Promise<Balance[]> {
  const [userBalancesRes, unlockAtsRes] = await Promise.all([
    multicall({
      ctx,
      calls: vesters.map((vester) => ({ target: vester.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: vesters.map((vester) => ({ target: vester.address }) as const),
      abi: abi.end_time,
    }),
  ])

  return mapSuccessFilter(userBalancesRes, (res, idx) => {
    const unlockAt = Number(unlockAtsRes[idx].success ? unlockAtsRes[idx].output : undefined)

    return {
      ...vesters[idx],
      amount: res.output,
      unlockAt,
      underlyings: undefined,
      rewards: undefined,
      category: 'vest',
    }
  })
}
