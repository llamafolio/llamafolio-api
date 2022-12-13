import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getMarketsBalances } from '@lib/compound/v2/lending'
import { Token } from '@lib/token'
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
  chain: Chain,
  contracts: Contract[],
  comptroller: Contract,
): Promise<Balance[]> {
  const VAIMinted: Balance[] = []

  const marketsBalances = await getMarketsBalances(ctx, 'bsc', contracts)

  const VAIBalancesRes = await call({
    chain,
    target: comptroller.address,
    params: [ctx.address],
    abi: abi.mintedVAIs,
  })

  const VAIBalances = BigNumber.from(VAIBalancesRes.output)

  VAIMinted.push({
    chain,
    decimals: VAI.decimals,
    symbol: VAI.symbol,
    address: VAI.address,
    amount: VAIBalances,
    type: 'debt',
    category: 'borrow',
  })

  return [...marketsBalances, ...VAIMinted]
}
