import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getMarketsBalances } from '@lib/compound/v2/lending'
import { BigNumber } from 'ethers'

export async function getLendBorrowBalances(
  ctx: BalancesContext,
  chain: Chain,
  contracts: Contract[],
  comptroller: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []
  const VAI = comptroller.underlyings?.[1]

  const contractsBalances = await getMarketsBalances(ctx, 'bsc', contracts)

  const VAIBorrowBalancesRes = await call({
    chain,
    target: comptroller.address,
    params: [ctx.address],
    abi: {
      constant: true,
      inputs: [{ internalType: 'address', name: '', type: 'address' }],
      name: 'mintedVAIs',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  })

  const VAIBorrowBalances = BigNumber.from(VAIBorrowBalancesRes.output)

  if (VAI) {
    balances.push({
      chain,
      decimals: VAI.decimals,
      symbol: VAI.symbol,
      address: VAI.address,
      amount: VAIBorrowBalances,
      type: 'debt',
      category: 'borrow',
    })
  }

  return [...contractsBalances, ...balances]
}
