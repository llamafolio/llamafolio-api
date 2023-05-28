import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  getRewardsBalance: {
    inputs: [
      { internalType: 'contract IScaledBalanceToken[]', name: '_assets', type: 'address[]' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'getRewardsBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const weth: Token = {
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbol: 'WETH',
}

const bend: Token = {
  chain: 'ethereum',
  address: '0x0d02755a5700414B26FF040e1dE35D337DF56218',
  decimals: 18,
  symbol: 'BEND',
}

export async function getBendBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const [balanceOfRes, rewardsOfRes] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: contract.rewarder, params: [[contract.address], ctx.address], abi: abi.getRewardsBalance }),
  ])

  return {
    ...contract,
    amount: balanceOfRes,
    underlyings: [weth],
    rewards: [{ ...bend, amount: rewardsOfRes }],
    category: 'farm',
  }
}
