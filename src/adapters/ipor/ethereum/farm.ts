import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { parseEther } from 'viem'

const abi = {
  balanceOf: {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'address', name: 'lpToken', type: 'address' },
    ],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  calculateExchangeRate: {
    inputs: [],
    name: 'calculateExchangeRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  calculateAccountRewards: {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'address[]', name: 'lpTokens', type: 'address[]' },
    ],
    name: 'calculateAccountRewards',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'lpToken', type: 'address' },
          { internalType: 'uint256', name: 'rewardsAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'allocatedPwTokens', type: 'uint256' },
        ],
        internalType: 'struct LiquidityMiningTypes.AccountRewardResult[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const IPOR: Token = {
  chain: 'ethereum',
  address: '0x1e4746dC744503b53b4A082cB3607B169a289090',
  decimals: 18,
  symbol: 'IPOR',
}

export async function getIporFarmBalances(
  ctx: BalancesContext,
  assets: Contract[],
  farmer: Contract,
): Promise<Balance[]> {
  const [userBalancesRes, userPendingRewardsRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: farmer.address, params: [ctx.address, asset.token!] }) as const),
      abi: abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: farmer.address, params: [ctx.address, [asset.token!]] }) as const),
      abi: abi.calculateAccountRewards,
    }),
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: asset.address }) as const),
      abi: abi.calculateExchangeRate,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [userBalancesRes[i], userPendingRewardsRes[i]]),

    (res, index) => {
      const asset = assets[index]
      const pricePerFullShare = exchangeRatesRes[index].success
        ? exchangeRatesRes[index].output! / parseEther('1.0')
        : 1n
      const underlying = asset.underlyings![0] as Contract
      if (!underlying || !pricePerFullShare) return null

      const [{ output: amount }, { output: rewards }] = res.inputOutputPairs
      const [{ rewardsAmount }] = rewards

      return {
        ...asset,
        decimals: 18,
        amount,
        underlyings: [{ ...underlying, amount: amount * pricePerFullShare }],
        rewards: [{ ...IPOR, amount: rewardsAmount }],
        category: 'farm' as Category,
      }
    },
  ).filter(isNotNullish)
}
