import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
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
  pendingXVS: {
    constant: true,
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingXVS',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

const XVS: Token = {
  chain: 'bsc',
  address: '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63',
  decimals: 18,
  symbol: 'XVS',
}

const VAI: Token = {
  chain: 'bsc',
  symbol: 'VAI',
  decimals: 18,
  address: '0x4BD17003473389A42DAF6a0a729f6Fdb328BbBd7',
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [stakeBalanceRes, pendingXVSRes] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: abi.userInfo,
    }),

    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: abi.pendingXVS,
    }),
  ])

  const stakeBalance = BigNumber.from(stakeBalanceRes.output.amount)
  const pendingXVS = BigNumber.from(pendingXVSRes.output)

  balances.push({
    chain: ctx.chain,
    address: VAI.address,
    decimals: VAI.decimals,
    symbol: VAI.symbol,
    amount: stakeBalance,
    rewards: [{ ...XVS, amount: pendingXVS }],
    category: 'stake',
  })

  return balances
}
