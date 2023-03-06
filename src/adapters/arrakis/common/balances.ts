import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

export async function getLpBalances(ctx: BalancesContext, contracts: Contract[]) {
  const balances: Balance[] = []

  const nonZeroBalances = (contracts as Balance[]).filter((balance) => balance.amount.gt(0))

  const calls = nonZeroBalances.map((balance) => ({
    params: [],
    target: balance.address,
  }))

  const [underlyingBalancesRes, totalSupplyRes] = await Promise.all([
    multicall({
      ctx,
      calls,
      abi: {
        inputs: [],
        name: 'getUnderlyingBalances',
        outputs: [
          {
            internalType: 'uint256',
            name: 'amount0Current',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'amount1Current',
            type: 'uint256',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    multicall({
      ctx,
      calls: calls,
      abi: {
        inputs: [],
        name: 'totalSupply',
        outputs: [
          {
            internalType: 'uint256',
            name: '',
            type: 'uint256',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  for (let i = 0; i < calls.length; i++) {
    if (!underlyingBalancesRes[i].success || !totalSupplyRes[i].success) {
      continue
    }

    ;(nonZeroBalances[i].underlyings![0] as Balance).amount = BigNumber.from(nonZeroBalances[i].amount)
      .mul(underlyingBalancesRes[i].output.amount0Current)
      .div(totalSupplyRes[i].output)
    ;(nonZeroBalances[i].underlyings![1] as Balance).amount = BigNumber.from(nonZeroBalances[i].amount)
      .mul(underlyingBalancesRes[i].output.amount1Current)
      .div(totalSupplyRes[i].output)

    nonZeroBalances[i].category = 'lp'
    balances.push(nonZeroBalances[i])
  }

  return balances
}
