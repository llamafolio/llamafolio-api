import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  pendingAtlantis: {
    constant: true,
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingAtlantis',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

const atl: Token = {
  chain: 'bsc',
  address: '0x1fd991fb6c3102873ba68a4e6e6a87b3a5c10271',
  decimals: 18,
  symbol: 'ATL',
}

const busd: Token = {
  chain: 'bsc',
  address: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
  decimals: 18,
  symbol: 'BUSD',
}

export async function getAtlantisFarmBalances(ctx: BalancesContext, lpStaker: Contract): Promise<Balance[]> {
  const [balancesOfsRes, pendingRewardsRes] = await Promise.all([
    call({ ctx, target: lpStaker.address, params: [ctx.address], abi: abi.userInfo }),
    call({ ctx, target: lpStaker.address, params: [ctx.address], abi: abi.pendingAtlantis }),
  ])

  const balance: Balance = {
    ...lpStaker,
    address: lpStaker.lpToken.address,
    amount: BigNumber.from(balancesOfsRes.output.amount),
    symbol: lpStaker.lpToken.symbol,
    decimals: 18,
    underlyings: [atl, busd],
    rewards: [{ ...atl, amount: BigNumber.from(pendingRewardsRes.output) }],
    category: 'farm',
  }

  return getUnderlyingBalances(ctx, [balance])
}
