import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abiSNX = {
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getVestBalances(
  ctx: BalancesContext,
  escrow: Contract,
  liquidator: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const earnedRes = await call({
    ctx,
    target: liquidator.address,
    params: [ctx.address],
    abi: abiSNX.earned,
  })

  const amount = BigNumber.from(escrow.amount)
  const rewards = BigNumber.from(earnedRes.output)
  const SNX = escrow.underlyings?.[0]

  if (SNX) {
    balances.push({
      chain: ctx.chain,
      address: SNX.address,
      decimals: SNX.decimals,
      symbol: SNX.symbol,
      amount,
      rewards: [{ ...SNX, amount: rewards }],
      category: 'vest',
    })
  }

  return balances
}
