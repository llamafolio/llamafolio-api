import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  getIndexOf: {
    inputs: [
      {
        internalType: 'address',
        name: 'stakerAddr',
        type: 'address',
      },
    ],
    name: 'getIndexOf',
    outputs: [
      {
        internalType: 'int256',
        name: '',
        type: 'int256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getStaker: {
    inputs: [
      {
        internalType: 'int256',
        name: 'stakerIndex',
        type: 'int256',
      },
    ],
    name: 'getStaker',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'stakerAddr',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'avaxAssigned',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'avaxStaked',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'avaxValidating',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'avaxValidatingHighWater',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'ggpRewards',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'ggpStaked',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'lastRewardsCycleCompleted',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'rewardsStartTime',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'ggpLockedUntil',
            type: 'uint256',
          },
        ],
        internalType: 'struct Staking.Staker',
        name: 'staker',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [
      {
        internalType: 'uint256',
        name: 'shares',
        type: 'uint256',
      },
    ],
    name: 'convertToAssets',
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

const WAVAX: Contract = {
  chain: 'avalanche',
  address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
  decimals: 18,
  symbol: 'WAVAX',
}

export async function getGGPStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const userId = await call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getIndexOf })
  const userInfos = await call({ ctx, target: staker.address, params: [userId], abi: abi.getStaker })

  const { ggpStaked, avaxStaked } = userInfos
  const [underlying0, underlying1] = staker.underlyings as Balance[]

  const ggp: Balance = {
    ...underlying0,
    amount: ggpStaked,
    category: 'stake',
  }

  const wavax: Balance = {
    ...underlying1,
    amount: avaxStaked,
    category: 'stake',
  }

  return [ggp, wavax]
}

export async function getGGPFarmBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const userBalance = await call({ ctx, target: farmer.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const fmtUserBalances = await call({ ctx, target: farmer.address, params: [userBalance], abi: abi.convertToAssets })

  return {
    ...farmer,
    amount: userBalance,
    underlyings: [{ ...WAVAX, amount: fmtUserBalances, decimals: farmer.decimals }],
    rewards: undefined,
    category: 'stake',
  }
}
