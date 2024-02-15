import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'
import { parseEther } from 'viem'

const abi = {
  primeETHPrice: {
    inputs: [],
    name: 'primeETHPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const LRT_ORACLE: `0x${string}` = '0xA755c18CD2376ee238daA5Ce88AcF17Ea74C1c32'

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getPrimeBalances(ctx: BalancesContext, primeETH: Contract): Promise<Balance> {
  const [primeETHBalance, pricePerFullShare] = await Promise.all([
    getSingleStakeBalance(ctx, primeETH),
    call({ ctx, target: LRT_ORACLE, abi: abi.primeETHPrice }),
  ])

  return {
    ...primeETHBalance,
    underlyings: [{ ...WETH, amount: (primeETHBalance.amount * pricePerFullShare) / parseEther('1.0') }],
  }
}
