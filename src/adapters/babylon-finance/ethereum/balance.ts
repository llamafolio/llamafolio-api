import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_TEN } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  lastPricePerShare: {
    inputs: [],
    name: 'lastPricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getBabylonBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balancesOfRes, pricePerSharesRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] })),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address })),
      abi: abi.lastPricePerShare,
    }),
  ])

  for (let poolIdx = 0; poolIdx < contracts.length; poolIdx++) {
    const contract = contracts[poolIdx]
    const balanceOfRes = balancesOfRes[poolIdx]
    const pricePerShareRes = pricePerSharesRes[poolIdx]

    if (!isSuccess(balanceOfRes) || !isSuccess(pricePerShareRes)) {
      continue
    }

    balances.push({
      ...contract,
      amount: BigNumber.from(balanceOfRes.output).mul(pricePerShareRes.output).div(BN_TEN.pow(contract.decimals!)),
      underlyings: contract.underlyings as Contract[],
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}
