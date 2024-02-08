import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  exchangeRateToNative: {
    inputs: [],
    name: 'exchangeRateToNative',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface Output {
  output: bigint
}

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getEigenpieStakerBalances(ctx: BalancesContext, rsts: Contract[]): Promise<Balance[]> {
  const [shareBalances, pricePerShares] = await Promise.all([
    multicall({
      ctx,
      calls: rsts.map((rst) => ({ target: rst.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: rsts.map((rst) => ({ target: rst.address }) as const),
      abi: abi.exchangeRateToNative,
    }),
  ])

  return mapMultiSuccessFilter(
    shareBalances.map((_, i) => [shareBalances[i], pricePerShares[i]]),

    (res, index) => {
      const rst = rsts[index]
      const [{ output: share }, { output: pricePerShare }] = res.inputOutputPairs as Output[]

      return {
        ...rst,
        amount: share,
        underlyings: [{ ...WETH, amount: (share * pricePerShare) / parseEther('1.0') }],
        category: 'stake',
      }
    },
  )
}
