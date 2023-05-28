import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  stakes: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'stakes',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPendingETHGain: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getPendingETHGain',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPendingLUSDGain: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getPendingLUSDGain',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getStakeBalances(ctx: BalancesContext, lqtyStaking: Contract) {
  const [LQTYBalanceRes, ETHBalanceRes, LUSDBalanceRes] = await Promise.all([
    call({ ctx, target: lqtyStaking.address, params: [ctx.address], abi: abi.stakes }),
    call({ ctx, target: lqtyStaking.address, params: [ctx.address], abi: abi.getPendingETHGain }),
    call({ ctx, target: lqtyStaking.address, params: [ctx.address], abi: abi.getPendingLUSDGain }),
  ])

  const amount = LQTYBalanceRes

  const balance: Balance = {
    chain: ctx.chain,
    category: 'stake',
    address: lqtyStaking.address,
    symbol: 'LQTY',
    decimals: 18,
    amount,
    underlyings: [
      {
        chain: ctx.chain,
        address: '0x6DEA81C8171D0bA574754EF6F8b412F2Ed88c54D',
        name: 'LQTY',
        symbol: 'LQTY',
        decimals: 18,
        amount,
      },
    ],
    rewards: [
      {
        chain: ctx.chain,
        symbol: 'LUSD',
        decimals: 18,
        address: '0x5f98805a4e8be255a32880fdec7f6728c6568ba0',
        amount: LUSDBalanceRes,
        stable: true,
      },
      {
        chain: ctx.chain,
        symbol: 'ETH',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000',
        amount: ETHBalanceRes,
      },
    ],
  }

  return balance
}
