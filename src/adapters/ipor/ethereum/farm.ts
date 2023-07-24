import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { parseEther } from 'viem'

const abi = {
  balanceOf: {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'lpToken',
        type: 'address',
      },
    ],
    name: 'balanceOf',
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
  calculateAccountRewards: {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'lpToken',
        type: 'address',
      },
    ],
    name: 'calculateAccountRewards',
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
  const balances: Balance[] = []

  const [userBalancesRes, userPendingRewardsRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: farmer.address, params: [ctx.address, asset.token!] }) as const),
      abi: abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: farmer.address, params: [ctx.address, asset.token!] }) as const),
      abi: abi.calculateAccountRewards,
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
    const userPendingRewardRes = userPendingRewardsRes[assetIdx]
    const exchangeRateRes = exchangeRatesRes[assetIdx]

    if (!underlying || !userBalanceRes.success || !userPendingRewardRes.success || !exchangeRateRes.success) {
      continue
    }

    balances.push({
      ...asset,
      decimals: 18,
      amount: userBalanceRes.output,
      underlyings: [
        { ...underlying, decimals: 18, amount: (userBalanceRes.output * exchangeRateRes.output) / parseEther('1.0') },
      ],
      rewards: [{ ...IPOR, amount: userPendingRewardRes.output }],
      category: 'farm',
    })
  }

  return balances
}
