import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import type { Token } from '@lib/token'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'
import { BigNumber, utils } from 'ethers'

const abi = {
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'uint256', name: 'lastDepositedTime', type: 'uint256' },
      { internalType: 'uint256', name: 'wigoAtLastUserAction', type: 'uint256' },
      { internalType: 'uint256', name: 'lastUserActionTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const wigo: Token = {
  chain: 'fantom',
  address: '0xe992beab6659bff447893641a378fbbf031c5bd6',
  decimals: 18,
  symbol: 'WIGO',
}

export async function getWigoBalances(ctx: BalancesContext, pool: Contract): Promise<Balance> {
  const [userInfo, pricePerFullShare] = await Promise.all([
    call({ ctx, target: pool.address, params: [ctx.address], abi: abi.userInfo }),
    call({ ctx, target: pool.address, abi: abi.getPricePerFullShare }),
  ])
  const [shares] = userInfo

  return {
    ...pool,
    amount: BigNumber.from(shares).mul(pricePerFullShare).div(utils.parseEther('1.0')),
    underlyings: [wigo],
    rewards: undefined,
    category: 'farm',
  }
}

export async function getWigoswapPairsBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
  rewardToken: Token,
  rewardTokenName?: string,
  lpTokenAbi?: boolean,
) {
  return Promise.all([
    getPairsBalances(ctx, pairs),
    getMasterChefPoolsBalances(ctx, pairs, masterchef, rewardToken, rewardTokenName, lpTokenAbi),
  ])
}
