import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const USDC: Token = {
  chain: 'ethereum',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
}

export async function getStakeBalances(ctx: BalancesContext, chain: Chain, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const amount = BigNumber.from(balanceOfRes.output)

  balances.push({
    chain,
    address: USDC.address,
    decimals: USDC.decimals,
    symbol: USDC.symbol,
    amount,
    category: 'stake',
  })

  return balances
}
