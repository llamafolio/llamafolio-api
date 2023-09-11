import type { Balance, BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  depositedAsset: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'depositedAsset',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getBorrowedOf: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getBorrowedOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const eUSD: Token = {
  chain: 'ethereum',
  address: '0xdf3ac4F479375802A821f7b7b46Cd7EB5E4262cC',
  decimals: 18,
  symbol: 'eUSD',
}

export async function getLybraLendBalances(ctx: BalancesContext, vaults: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userDepositsRes, userBorrowsRes] = await Promise.all([
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address, params: [ctx.address] }) as const),
      abi: abi.depositedAsset,
    }),
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address, params: [ctx.address] }) as const),
      abi: abi.getBorrowedOf,
    }),
  ])

  for (const [index, vault] of vaults.entries()) {
    const userDepositRes = userDepositsRes[index]
    const userBorrowRes = userBorrowsRes[index]

    if (!userDepositRes.success || !userBorrowRes.success) {
      continue
    }

    const lend: LendBalance = {
      ...vault,
      amount: userDepositRes.output,
      underlyings: undefined,
      rewards: undefined,
      category: 'lend',
    }

    const borrow: BorrowBalance = {
      ...eUSD,
      amount: userBorrowRes.output,
      underlyings: undefined,
      rewards: undefined,
      category: 'borrow',
    }

    balances.push(lend, borrow)
  }

  return balances
}
