import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { parseEther } from 'viem'
const abi = {
  elETHPrice: {
    inputs: [],
    name: 'elETHPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const oracle: `0x${string}` = '0x0d7fD234d543A04CADEDa3Fc58dF524656707faC'

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getEuclidBalance(ctx: BalancesContext, elETH: Contract): Promise<Balance> {
  const [userDeposit, exchangeRate] = await Promise.all([
    call({ ctx, target: elETH.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: oracle, abi: abi.elETHPrice }),
  ])

  return {
    ...elETH,
    amount: userDeposit,
    underlyings: [{ ...WETH, amount: (userDeposit * exchangeRate) / parseEther('1.0') }],
    rewards: undefined,
    category: 'stake',
  }
}
