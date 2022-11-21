import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

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

export async function getStakeBalances(ctx: BaseContext, chain: Chain, contract: Contract) {
  const balances: Balance[] = []

  const [stakeBalanceRes, pendingXVSRes] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: {
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
    }),

    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: {
        constant: true,
        inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
        name: 'pendingXVS',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const stakeBalance = BigNumber.from(stakeBalanceRes.output.amount)
  const pendingXVS = BigNumber.from(pendingXVSRes.output)

  balances.push({
    chain,
    address: VAI.address,
    decimals: VAI.decimals,
    symbol: VAI.symbol,
    amount: stakeBalance,
    rewards: [{ ...XVS, amount: pendingXVS }],
    category: 'stake',
  })

  return balances
}
