import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { BigNumber } from 'ethers'

const NMS: Contract = {
  name: 'Nemesis DAO',
  chain: 'bsc',
  address: '0x8AC9DC3358A2dB19fDd57f433ff45d1fc357aFb3',
  decimals: 9,
  symbol: 'NMS',
}

export async function getStakeBalances(ctx: BalancesContext, chain: Chain, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const balanceOf = BigNumber.from(balanceOfRes.output)

  balances.push({
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount: balanceOf,
    underlyings: [NMS],
    category: 'stake',
  })

  return balances
}
