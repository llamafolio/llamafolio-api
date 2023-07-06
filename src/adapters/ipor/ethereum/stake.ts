import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'
import { parseEther } from 'viem'

const abi = {
  calculateExchangeRate: {
    inputs: [],
    name: 'calculateExchangeRate',
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

const IPOR: Token = {
  chain: 'ethereum',
  address: '0x1e4746dC744503b53b4A082cB3607B169a289090',
  decimals: 18,
  symbol: 'IPOR',
}

export async function getIporStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, exchangeRate] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: abi.calculateExchangeRate }),
  ])

  return {
    ...staker,
    amount: userBalance,
    underlyings: [{ ...IPOR, amount: (userBalance * exchangeRate) / parseEther('1.0') }],
    rewards: undefined,
    category: 'stake',
  }
}
