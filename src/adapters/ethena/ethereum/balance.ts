import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'

const abi = {
  stakes: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'stakes',
    outputs: [
      { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
      { internalType: 'uint152', name: 'coolingDownAmount', type: 'uint152' },
      { internalType: 'uint104', name: 'cooldownStartTimestamp', type: 'uint104' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const USDe: Contract = {
  chain: 'ethereum',
  address: '0x4c9EDD5852cd905f086C759E8383e09bff1E68B3',
  decimals: 18,
  symbol: 'USDe',
}

export async function getEthenaFarmBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const [stakedAmount, coolingDownAmount] = await call({
    ctx,
    target: farmer.address,
    params: [ctx.address, farmer.token!],
    abi: abi.stakes,
  })

  return {
    ...farmer,
    amount: stakedAmount + coolingDownAmount,
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }
}

export async function getEthenaStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const userShare = await call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf })
  const userAsset = await call({ ctx, target: staker.address, params: [userShare], abi: abi.convertToAssets })

  return {
    ...staker,
    amount: userShare,
    underlyings: [{ ...USDe, amount: userAsset }],
    rewards: undefined,
    category: 'stake',
  }
}
