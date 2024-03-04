import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getSingleStakeBalance } from '@lib/stake'

const abi = {
  borrowBalanceOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'borrowBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userCollateral: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userCollateral',
    outputs: [
      { internalType: 'uint128', name: 'balance', type: 'uint128' },
      { internalType: 'uint128', name: '_reserved', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getRewardOwed: {
    inputs: [
      { internalType: 'address', name: 'comet', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getRewardOwed',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'owed', type: 'uint256' },
        ],
        internalType: 'struct CometRewards.RewardOwed',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
} as const

const COMP: { [key: string]: `0x${string}` } = {
  arbitrum: '0x354A6dA3fcde098F8389cad84b0182725c6C91dE',
  base: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0',
  ethereum: '0xc00e94cb662c3520282e6f5717214004a7f26888',
  polygon: '0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c',
}

export async function getCompoundBalances(
  ctx: BalancesContext,
  compounder: Contract,
  debt: Contract,
  rewarder: Contract,
): Promise<Balance[]> {
  const assets = compounder.underlyings as Contract[]
  if (!assets) return []

  const [userStakeBalance, userLendBalances, userBorrowBalance, pendingCompRewards] = await Promise.all([
    getSingleStakeBalance(ctx, compounder),
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: compounder.address, params: [ctx.address, asset.address] }) as const),
      abi: abi.userCollateral,
    }),
    call({
      ctx,
      target: compounder.address,
      params: [ctx.address],
      abi: abi.borrowBalanceOf,
    }),
    call({
      ctx,
      target: rewarder.address,
      params: [compounder.address, ctx.address],
      abi: abi.getRewardOwed,
    }),
  ])

  const supplyBalances = mapSuccessFilter(userLendBalances, (res, index) => {
    const asset = assets[index]

    return { ...asset, amount: res.output[0], category: 'lend' }
  })

  const borrowBalance: Balance = { ...debt, amount: userBorrowBalance, category: 'borrow' }

  const rewardBalance: Balance = {
    chain: ctx.chain,
    address: COMP[ctx.chain],
    decimals: 18,
    symbol: 'COMP',
    amount: pendingCompRewards.owed,
    category: 'reward',
  }

  return [userStakeBalance, ...supplyBalances, borrowBalance, rewardBalance]
}
