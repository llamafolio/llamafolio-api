import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { parseEther } from 'viem'

const abi = {
  getRate: {
    inputs: [],
    name: 'getRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getSwellBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const [balanceOfs, rates] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address }) as const),
      abi: abi.getRate,
    }),
  ])

  return balanceOfs
    .map((balanceOf, index) => {
      const rate = rates[index]
      if (!rate.success || !balanceOf.success) return null

      return {
        ...contracts[index],
        amount: balanceOf.output,
        underlyings: [{ ...WETH, amount: (balanceOf.output * rate.output) / parseEther('1.0') }],
        rewards: undefined,
        category: 'farm' as Category,
      }
    })
    .filter(isNotNullish)
}
