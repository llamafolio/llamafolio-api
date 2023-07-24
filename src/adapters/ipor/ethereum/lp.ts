import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  calculateExchangeRate: {
    inputs: [],
    name: 'calculateExchangeRate',
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
} as const

export async function getIporLpBalances(ctx: BalancesContext, assets: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userBalancesRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: asset.token!, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: asset.address }) as const),
      abi: abi.calculateExchangeRate,
    }),
  ])

  for (let assetIdx = 0; assetIdx < assets.length; assetIdx++) {
    const asset = assets[assetIdx]
    const underlying = asset.underlyings?.[0] as Contract
    const userBalanceRes = userBalancesRes[assetIdx]
    const exchangeRateRes = exchangeRatesRes[assetIdx]

    if (!underlying || !userBalanceRes.success || !exchangeRateRes.success) {
      continue
    }

    balances.push({
      ...asset,
      decimals: 18,
      amount: userBalanceRes.output,
      underlyings: [
        { ...underlying, decimals: 18, amount: (userBalanceRes.output * exchangeRateRes.output) / parseEther('1.0') },
      ],
      rewards: undefined,
      category: 'lp',
    })
  }

  return balances
}
