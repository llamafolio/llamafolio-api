import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleStakeBalance } from '@lib/stake'
import { parseEther } from 'viem'

const abi = {
  rsETHPrice: {
    inputs: [],
    name: 'rsETHPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const LRT_ORACLE: `0x${string}` = '0x349A73444b1a310BAe67ef67973022020d70020d'

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getKelpBalances(ctx: BalancesContext, rsETH: Contract): Promise<Balance> {
  const [rsETHBalances, pricePerFullShare] = await Promise.all([
    getSingleStakeBalance(ctx, rsETH),
    call({ ctx, target: LRT_ORACLE, abi: abi.rsETHPrice }),
  ])

  return {
    ...rsETHBalances,
    underlyings: [{ ...WETH, amount: (rsETHBalances.amount * pricePerFullShare) / parseEther('1.0') }],
  }
}
