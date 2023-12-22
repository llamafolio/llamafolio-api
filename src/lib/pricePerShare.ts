import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

interface OutputResponse {
  output: bigint
}

type PricePerShareBalance = Balance & {
  pricePerShare?: bigint
}

export interface PricePerShareParams {
  ctx: BalancesContext
  contract: Contract
  getAddress?: (contract: Contract) => `0x${string}`
}
export interface PricesPerSharesParams {
  ctx: BalancesContext
  contracts: Contract[]
  getAddress?: (contract: Contract) => `0x${string}`
}

interface GetPricePerShareBalanceParams {
  getAddress?: (contract: Contract) => `0x${string}`
  getCategory?: () => Category
  getPricePerShare?: (params: PricePerShareParams) => Promise<bigint>
}

interface GetPricesPerSharesBalancesParams {
  getAddress?: (contract: Contract) => `0x${string}`
  getCategory?: () => Category
  getPricesPerShares?: (params: PricesPerSharesParams) => Promise<bigint[]>
}

export async function getPricePerShare({
  ctx,
  contract,
  getAddress = (contract: Contract) => contract.token!,
}: PricePerShareParams): Promise<bigint> {
  const decimals = contract.decimals!
  const target = getAddress(contract) || contract.address

  const [tokenBalance, tokenSupply] = await Promise.all([
    call({ ctx, target, params: [contract.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: contract.address, abi: erc20Abi.totalSupply }),
  ])

  if (tokenBalance === 0n) return 1n * 10n ** BigInt(decimals)
  return (tokenBalance * 10n ** BigInt(decimals)) / tokenSupply
}

export async function getPricePerShareBalance(
  ctx: BalancesContext,
  contract: PricePerShareBalance,
  params: GetPricePerShareBalanceParams,
): Promise<Balance> {
  const _getPricePerShare = params.getPricePerShare || getPricePerShare
  const _getCategory =
    typeof params.getCategory === 'function' ? params.getCategory() : params.getCategory || contract.category
  const pricePerShare = contract.pricePerShare || (await _getPricePerShare({ ctx, contract }))
  const rawUnderlying = contract.underlyings?.[0] as Contract

  const assetAmount = (contract.amount * pricePerShare) / 10n ** BigInt(contract.decimals!)

  if (!rawUnderlying) return { ...contract, amount: assetAmount, category: _getCategory }
  return { ...contract, underlyings: [{ ...rawUnderlying, amount: assetAmount }], category: _getCategory }
}

export async function getPricesPerShares({
  ctx,
  contracts,
  getAddress = (contract: Contract) => contract.token!,
}: PricesPerSharesParams): Promise<bigint[]> {
  const tokenCalls = contracts.map((contract) => {
    const target = getAddress(contract) || contract.address
    return { ctx, target, params: [contract.address], abi: erc20Abi.balanceOf } as const
  })

  const suppliesCalls = contracts.map((contract) => {
    return { ctx, target: contract.address, abi: erc20Abi.totalSupply } as const
  })

  const [tokenBalances, suppliesBalances] = await Promise.all([
    multicall({ ctx, calls: tokenCalls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: suppliesCalls, abi: erc20Abi.totalSupply }),
  ])

  return mapMultiSuccessFilter(
    tokenBalances.map((_, i) => [tokenBalances[i], suppliesBalances[i]]),
    (res, index) => {
      const decimals = BigInt(contracts[index].decimals!)
      const [{ output: balance }, { output: supply }] = res.inputOutputPairs as OutputResponse[]

      if (balance === 0n) return 1n * 10n ** decimals
      return (balance * 10n ** decimals) / supply
    },
  )
}

export async function getPricesPerSharesBalances(
  ctx: BalancesContext,
  contracts: PricePerShareBalance[],
  params: GetPricesPerSharesBalancesParams,
): Promise<Balance[]> {
  const _getPricesPerShares = params.getPricesPerShares || getPricesPerShares
  const pricesPerShares = await _getPricesPerShares({ ctx, contracts })

  return Promise.all(
    contracts.map(async (contract, index) => {
      const pricePerShare = contract.pricePerShare !== undefined ? contract.pricePerShare : pricesPerShares[index] || 1n

      const rawUnderlying = contract.underlyings?.[0] as Contract
      const assetAmount = (contract.amount * pricePerShare) / 10n ** BigInt(contract.decimals!)
      const _getCategory =
        typeof params.getCategory === 'function' ? params.getCategory() : params.getCategory || contract.category

      if (!rawUnderlying) return { ...contract, amount: assetAmount, category: _getCategory }
      return { ...contract, underlyings: [{ ...rawUnderlying, amount: assetAmount }], category: _getCategory }
    }),
  )
}
