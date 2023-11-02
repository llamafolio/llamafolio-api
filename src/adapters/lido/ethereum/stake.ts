import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { getPricePerFullShare } from '@lib/pricePerFullShare'

const abi = {
  stEthPerToken: {
    inputs: [],
    name: 'stEthPerToken',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLidoStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  // const underlyings = await getPricePerFullShare(ctx, userBalance, {
  //   fromTokenAddress: staker.address,
  //   toTokenAddresses: staker.underlyings as Contract[],
  // })

  const underlyings = await getPricePerFullShare(ctx, userBalance, {
    fromTokenAddress: staker.address,
    toTokenAddresses: staker.underlyings as Contract[],
    getExchangeRates: async (ctx, { fromTokenAddress, toTokens }) => {
      const exchangeRate = await call({ ctx, target: fromTokenAddress, abi: abi.stEthPerToken })
      return toTokens.map(() => exchangeRate)
    },
  })

  return {
    ...staker,
    amount: userBalance,
    underlyings,
    rewards: undefined,
    category: 'stake',
  }
}
