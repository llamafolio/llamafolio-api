import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall, type Call } from '@lib/multicall'

const abi = {
  getCurrentStakeByCollateralNameAndStaker: {
    inputs: [
      { internalType: 'bytes32', name: '_collateralName', type: 'bytes32' },
      { internalType: 'address', name: '_staker', type: 'address' },
    ],
    name: 'getCurrentStakeByCollateralNameAndStaker',
    outputs: [
      { internalType: 'uint96', name: '', type: 'uint96' },
      { internalType: 'uint96', name: '', type: 'uint96' },
      { internalType: 'uint96', name: '', type: 'uint96' },
      { internalType: 'uint96', name: '', type: 'uint96' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getUnclaimedDDXRewards: {
    inputs: [{ internalType: 'address', name: '_claimant', type: 'address' }],
    name: 'getUnclaimedDDXRewards',
    outputs: [{ internalType: 'uint96', name: '', type: 'uint96' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const DDX: Contract = {
  chain: 'ethereum',
  address: '0x3a880652f47bfaa771908c07dd8673a787daed3a',
  symbol: 'DDX',
  decimals: 18,
}

const USDC: Contract = {
  chain: 'ethereum',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
}

const USDT: Contract = {
  chain: 'ethereum',
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  decimals: 6,
  symbol: 'USDT',
}

const HUSD: Contract = {
  chain: 'ethereum',
  address: '0xdF574c24545E5FfEcb9a659c229253D4111d87e1',
  decimals: 8,
  symbol: 'HUSD',
}

const GUSD: Contract = {
  chain: 'ethereum',
  address: '0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd',
  decimals: 8,
  symbol: 'GUSD',
}

const tokenIds: { [key: string]: Contract } = {
  '0x44657269766144455820496e737572616e636520555344540000000000000000': USDT,
  '0x44657269766144455820496e737572616e636520635553445400000000000000': USDT,
  '0x44657269766144455820496e737572616e636520555344430000000000000000': USDC,
  '0x44657269766144455820496e737572616e636520635553444300000000000000': USDC,
  '0x44657269766144455820496e737572616e636520485553440000000000000000': HUSD,
  '0x44657269766144455820496e737572616e636520475553440000000000000000': GUSD,
}

export async function getDerivaDexBalances(ctx: BalancesContext, controller: Contract): Promise<Balance[]> {
  const calls: Call<typeof abi.getCurrentStakeByCollateralNameAndStaker>[] = Object.keys(tokenIds).map((key) => ({
    target: controller.address,
    params: [key as `0x${string}`, ctx.address],
  }))

  const [balances, pendingReward] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getCurrentStakeByCollateralNameAndStaker }),
    call({ ctx, target: controller.address, params: [ctx.address], abi: abi.getUnclaimedDDXRewards }),
  ])

  const reward = {
    ...DDX,
    amount: pendingReward,
    underlyings: undefined,
    rewards: undefined,
    category: 'reward',
  }

  const stakes = mapSuccessFilter(balances, (res) => {
    const key = res.input.params![0]
    const token = tokenIds[key]

    return {
      ...token,
      amount: res.output[0],
      underlyings: undefined,
      rewards: undefined,
      category: 'stake',
    }
  })

  return [...stakes, reward]
}
