import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getMarketsBalances } from '@lib/compound/v2/lending'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  mintedVAIs: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'mintedVAIs',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

const VAI: Token = {
  chain: 'bsc',
  symbol: 'VAI',
  decimals: 18,
  address: '0x4BD17003473389A42DAF6a0a729f6Fdb328BbBd7',
}

export async function getLendBorrowBalances(
  ctx: BalancesContext,
  contracts: Contract[],
  comptroller: Contract,
): Promise<Balance[]> {
  const VAIMinted: Balance[] = []

  const marketsBalances = await getMarketsBalances(ctx, contracts)

  const VAIBalancesRes = await call({
    ctx,
    target: comptroller.address,
    params: [ctx.address],
    abi: abi.mintedVAIs,
  })

  const VAIBalances = BigNumber.from(VAIBalancesRes.output)

  VAIMinted.push({
    chain: ctx.chain,
    decimals: VAI.decimals,
    symbol: VAI.symbol,
    address: VAI.address,
    amount: VAIBalances,
    category: 'borrow',
  })

  return [...marketsBalances, ...VAIMinted]
}
