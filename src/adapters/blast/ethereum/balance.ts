import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  balanceOf: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'balanceOf',
    outputs: [
      { internalType: 'uint256', name: 'ethBalance', type: 'uint256' },
      { internalType: 'uint256', name: 'usdBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

const DAI: Contract = {
  chain: 'ethereum',
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  decimals: 18,
  symbol: 'DAI',
}

function getBalance(contract: Contract, amount: bigint): Balance {
  return {
    ...contract,
    amount: amount,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }
}

export async function getBlastDepositBalances(ctx: BalancesContext, staker: Contract) {
  const [ethAmount, daiAmount] = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  return [getBalance(WETH, ethAmount), getBalance(DAI, daiAmount)]
}
