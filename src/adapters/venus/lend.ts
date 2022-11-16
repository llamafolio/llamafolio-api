import { call } from '@defillama/sdk/build/abi'
import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { getMarketsBalances } from '@lib/compound/v2/lending'
import { BigNumber } from 'ethers'

export async function getLendBorrowBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[],
  comptroller?: Contract,
) {
  if (!contracts || !comptroller || !comptroller.underlyings) {
    console.log('Missing or incorrect contracts/comptroller')

    return []
  }

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

  balances.push({
    chain,
    decimals: VAI.decimals,
    symbol: VAI.symbol,
    address: VAI.address,
    amount: VAIBorrowBalances,
    type: "debt",
    category: 'borrow',
  })

  return [...contractsBalances, ...balances]
}
