import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getCompoundedLUSDDeposit: {
    inputs: [
      {
        internalType: 'address',
        name: '_depositor',
        type: 'address',
      },
    ],
    name: 'getCompoundedLUSDDeposit',
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
  getDepositorETHGain: {
    inputs: [
      {
        internalType: 'address',
        name: '_depositor',
        type: 'address',
      },
    ],
    name: 'getDepositorETHGain',
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
  getDepositorLQTYGain: {
    inputs: [
      {
        internalType: 'address',
        name: '_depositor',
        type: 'address',
      },
    ],
    name: 'getDepositorLQTYGain',
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

export async function getFarmBalance(ctx: BalancesContext, stabilityPool: Contract) {
  const [LUSDBalance, ETHBalance, LQTYBalance] = await Promise.all([
    call({ ctx, target: stabilityPool.address, params: [ctx.address], abi: abi.getCompoundedLUSDDeposit }),
    call({ ctx, target: stabilityPool.address, params: [ctx.address], abi: abi.getDepositorETHGain }),
    call({ ctx, target: stabilityPool.address, params: [ctx.address], abi: abi.getDepositorLQTYGain }),
  ])

  const balance: Balance = {
    chain: ctx.chain,
    category: 'farm',
    address: stabilityPool.address,
    symbol: 'LUSD',
    decimals: 18,
    amount: LUSDBalance,
    stable: true,
    underlyings: [
      {
        chain: ctx.chain,
        address: '0x5f98805a4e8be255a32880fdec7f6728c6568ba0',
        name: 'LUSD',
        symbol: 'LUSD',
        decimals: 18,
        stable: true,
        amount: LUSDBalance,
      },
    ],
    rewards: [
      {
        chain: ctx.chain,
        symbol: 'LQTY',
        decimals: 18,
        address: '0x6dea81c8171d0ba574754ef6f8b412f2ed88c54d',
        amount: LQTYBalance,
      },
      {
        chain: ctx.chain,
        symbol: 'ETH',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000',
        amount: ETHBalance,
      },
    ],
  }

  return balance
}
