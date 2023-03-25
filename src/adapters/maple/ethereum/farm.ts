import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  balanceOfAssets: {
    inputs: [{ internalType: 'address', name: 'account_', type: 'address' }],
    name: 'balanceOfAssets',
    outputs: [{ internalType: 'uint256', name: 'balanceOfAssets_', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getMapleFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOfsRes = await multicall({
    ctx,
    calls: farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] })),
    abi: abi.balanceOfAssets,
  })

  for (let farmerIdx = 0; farmerIdx < farmers.length; farmerIdx++) {
    const farmer = farmers[farmerIdx]
    const balanceOfRes = balanceOfsRes[farmerIdx]

    if (!isSuccess(balanceOfRes)) {
      continue
    }

    balances.push({
      ...farmer,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings: farmer.underlyings as Contract[],
      rewards: undefined,
      category: 'farm',
    })
  }

  return balances
}
