import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingBSW: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingBSW',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const BSW: Token = {
  chain: 'bsc',
  address: '0x965f527d9159dce6288a2219db51fc6eef120dd1',
  decimals: 18,
  symbol: 'BSW',
}

export async function getUniqueUnderlyingsMasterchefBalances(ctx: BalancesContext, masterchef: Contract) {
  const balances: Balance[] = []

  const [balanceOfRes, pendingRewardsRes] = await Promise.all([
    call({ ctx, target: masterchef.address, params: [0, ctx.address], abi: abi.userInfo }),
    call({ ctx, target: masterchef.address, params: [0, ctx.address], abi: abi.pendingBSW }),
  ])

  balances.push({
    chain: ctx.chain,
    address: BSW.address,
    decimals: BSW.decimals,
    symbol: 'BSW-LP',
    amount: BigNumber.from(balanceOfRes.output.amount),
    underlyings: [BSW],
    rewards: [{ ...BSW, amount: BigNumber.from(pendingRewardsRes.output) }],
    category: 'farm',
  })

  return balances
}
