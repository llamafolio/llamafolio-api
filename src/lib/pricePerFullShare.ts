import type { BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

interface GetPricePerFullShareProps {
  fromTokenAddress: `0x${string}`
  toTokenAddresses: Contract[]
  precisionFactor?: bigint
  getExchangeRates?: (ctx: BalancesContext, params: GetExchangeRateParams) => Promise<bigint[]>
}

interface GetExchangeRateParams {
  fromTokenAddress: `0x${string}`
  toTokens: Contract[]
  precisionFactor: bigint
}

export async function getPricePerFullShare(
  ctx: BalancesContext,
  amount: bigint,
  options: GetPricePerFullShareProps,
): Promise<Contract[]> {
  const _getExchangeRates = options.getExchangeRates || getExchangeRates
  const fromTokenAddress = options.fromTokenAddress
  const toTokens = options.toTokenAddresses
  const precisionFactor = options.precisionFactor || parseEther('1.0')

  const pricePerFullShares = await _getExchangeRates(ctx, { fromTokenAddress, toTokens, precisionFactor })

  return toTokens.map((token, index) => {
    return { ...token, amount: (amount * pricePerFullShares[index]) / precisionFactor }
  })
}

async function getExchangeRates(
  ctx: BalancesContext,
  { fromTokenAddress, toTokens, precisionFactor }: GetExchangeRateParams,
): Promise<bigint[]> {
  const [toTokenSupply, totalSupply] = await Promise.all([
    multicall({
      ctx,
      calls: toTokens.map((token) => ({ target: token.address, params: [fromTokenAddress] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    call({ ctx, target: fromTokenAddress, abi: erc20Abi.totalSupply }),
  ])

  return mapSuccessFilter(toTokenSupply, (res) => {
    return totalSupply !== 0n ? (res.output * precisionFactor) / totalSupply : 1n
  })
}
