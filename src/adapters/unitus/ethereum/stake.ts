import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { getBalancesOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getPricesPerSharesBalances, type PricesPerSharesParams } from '@lib/pricePerShare'

const abi = {
  getCurrentExchangeRate: {
    inputs: [],
    name: 'getCurrentExchangeRate',
    outputs: [{ internalType: 'uint256', name: '_exchangeRate', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getUnitusEthStakersBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const userShares = await getBalancesOf(ctx, [staker], { getAddress: (contract) => contract.address })
  return getPricesPerSharesBalances(ctx, userShares, {
    getPricesPerShares: (params) => getUnitusEthPricesPerShares({ ctx, contracts: params.contracts }),
    getCategory: () => 'stake',
  })
}

export async function getUnitusEthPricesPerShares({
  ctx,
  contracts,
  getAddress = (contract: Contract) => contract.token!,
}: PricesPerSharesParams): Promise<bigint[]> {
  const pricePerShares = await multicall({
    ctx,
    calls: contracts.map((contract) => ({ target: getAddress(contract) || contract.address }) as const),
    abi: abi.getCurrentExchangeRate,
  })

  return mapSuccessFilter(pricePerShares, (res) => res.output)
}
