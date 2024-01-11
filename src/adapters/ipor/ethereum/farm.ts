import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

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
  getBalance: {
    inputs: [],
    name: 'getBalance',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'totalCollateralPayFixed', type: 'uint256' },
          { internalType: 'uint256', name: 'totalCollateralReceiveFixed', type: 'uint256' },
          { internalType: 'uint256', name: 'liquidityPool', type: 'uint256' },
          { internalType: 'uint256', name: 'vault', type: 'uint256' },
        ],
        internalType: 'struct IporTypes.AmmBalancesMemory',
        name: '',
        type: 'tuple',
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
  const [userBalancesRes, userPendingRewardsRes, ipTokenSupplies, storageSupplies] = await Promise.all([
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
      calls: assets.map((asset) => ({ target: asset.token! }) as const),
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: asset.storage }) as const),
      abi: abi.getBalance,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalancesRes.map((_, i) => [
      userBalancesRes[i],
      userPendingRewardsRes[i],
      ipTokenSupplies[i],
      storageSupplies[i],
    ]),

    (res, index) => {
      const asset = assets[index]
      const underlying = asset.underlyings![0] as Contract

      const [{ output: amount }, { output: rewards }, { output: ipTokenSupply }, { output: storageSupplyRes }] =
        res.inputOutputPairs
      const [{ rewardsAmount }] = rewards
      const storageSupply = storageSupplyRes.liquidityPool
      const underlyingAmount = (amount * storageSupply) / ipTokenSupply

      return {
        ...asset,
        decimals: 18,
        amount,
        underlyings: [{ ...underlying, amount: underlyingAmount }],
        rewards: [{ ...IPOR, amount: rewardsAmount }],
        category: 'farm' as Category,
      }
    },
  ).filter(isNotNullish)
}
