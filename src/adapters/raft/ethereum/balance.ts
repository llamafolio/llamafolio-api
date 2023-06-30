import type { Balance, BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const R: Token = {
  chain: 'ethereum',
  address: '0x183015a9bA6fF60230fdEaDc3F43b3D788b13e21',
  decimals: 18,
  symbol: 'R',
}
const wstETH: Token = {
  chain: 'ethereum',
  address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  decimals: 18,
  symbol: 'wstETH',
}

export async function getRaftBalance(ctx: BalancesContext, pool: Contract): Promise<Balance[]> {
  const [userLendBalance, userDebtBalances] = await Promise.all([
    call({
      ctx,
      target: pool.token!,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),
    call({
      ctx,
      target: pool.debt![0].address,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),
  ])

  const lendBalance: LendBalance = {
    ...pool,
    amount: userLendBalance,
    underlyings: [wstETH],
    rewards: undefined,
    category: 'lend',
  }

  const borrowBalance: BorrowBalance = {
    ...pool.debt[0],
    amount: userDebtBalances,
    underlyings: [R],
    rewards: undefined,
    category: 'borrow',
  }

  return [lendBalance, borrowBalance]
}
