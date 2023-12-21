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
  pricePerShare?: number
}

interface PricePerShareParams {
  getAddress?: (contract: Contract) => `0x${string}`
}

interface GetPricePerShareBalanceParams {
  getAddress?: (contract: Contract) => `0x${string}`
  getCategory?: () => Category
  getPricePerShare?: (params: PricePerShareParams) => Promise<number>
}

interface GetPricesPerSharesBalancesParams {
  getAddress?: (contract: Contract) => `0x${string}`
  getCategory?: () => Category
  getPricesPerShares?: (params: PricePerShareParams) => Promise<number[]>
}

export async function getPricePerShare(
  ctx: BalancesContext,
  contract: Contract,
  { getAddress = (contract: Contract) => contract.token! }: PricePerShareParams = {},
): Promise<number> {
  const target = getAddress(contract) || contract.address

  const [tokenBalance, tokenSupply] = await Promise.all([
    call({ ctx, target, params: [contract.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: contract.address, abi: erc20Abi.totalSupply }),
  ])

  if (tokenBalance === 0n) return 1
  return Number(tokenBalance) / Number(tokenSupply)
}

export async function getPricePerShareBalance(
  ctx: BalancesContext,
  balance: PricePerShareBalance,
  params: GetPricePerShareBalanceParams,
): Promise<Balance> {
  const _getPricePerShare = params.getPricePerShare || getPricePerShare
  const _getCategory =
    typeof params.getCategory === 'function' ? params.getCategory() : params.getCategory || balance.category
  const pricePerShare = balance.pricePerShare || (await _getPricePerShare(ctx, balance))
  const rawUnderlying = balance.underlyings?.[0] as Contract

  const assetAmount = BigInt(Math.round(Number(balance.amount) * pricePerShare))

  if (!rawUnderlying) return { ...balance, amount: assetAmount, category: _getCategory }
  return { ...balance, underlyings: [{ ...rawUnderlying, amount: assetAmount }], category: _getCategory }
}

export async function getPricesPerShares(
  ctx: BalancesContext,
  contracts: Contract[],
  { getAddress = (contract: Contract) => contract.token! }: PricePerShareParams = {},
): Promise<number[]> {
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
    (res) => {
      const [{ output: balance }, { output: supply }] = res.inputOutputPairs as OutputResponse[]

      if (balance === 0n) return 1
      return Number(balance) / Number(supply)
    },
  )
}

export async function getPricesPerSharesBalances(
  ctx: BalancesContext,
  balances: PricePerShareBalance[],
  params: GetPricesPerSharesBalancesParams,
): Promise<Balance[]> {
  const _getPricesPerShares = params.getPricesPerShares || getPricesPerShares
  const pricesPerShares = await _getPricesPerShares(ctx, balances)

  return Promise.all(
    balances.map(async (balance, index) => {
      const rawUnderlying = balance.underlyings?.[0] as Contract
      const pricePerShare = pricesPerShares[index] || balance.pricePerShare
      const assetAmount = BigInt(Math.round(Number(balance.amount) * pricePerShare!))
      const _getCategory =
        typeof params.getCategory === 'function' ? params.getCategory() : params.getCategory || balance.category

      if (!rawUnderlying) return { ...balance, amount: assetAmount, category: _getCategory }
      return { ...balance, underlyings: [{ ...rawUnderlying, amount: assetAmount }], category: _getCategory }
    }),
  )
}
