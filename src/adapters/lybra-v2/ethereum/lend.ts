import type { BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

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
  badCollateralRatio: {
    inputs: [],
    name: 'badCollateralRatio',
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

export async function getLybraLendBalances(ctx: BalancesContext, vaults: Contract[]) {
  const [userDepositsRes, userBorrowsRes, MCRs] = await Promise.all([
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
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address }) as const),
      abi: abi.badCollateralRatio,
    }),
  ])

  return vaults
    .map((vault, index) => {
      const userDepositRes = userDepositsRes[index]
      const userBorrowRes = userBorrowsRes[index]
      const MCR = MCRs[index]

      if (!userDepositRes.success || !userBorrowRes.success) {
        return null
      }

      const lend: LendBalance = {
        ...vault,
        amount: userDepositRes.output,
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
        MCR: MCR.output != null ? parseFloatBI(MCR.output, 18) / 100 : undefined,
      }

      const borrow: BorrowBalance = {
        ...eUSD,
        amount: userBorrowRes.output,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return { balances: [lend, borrow] }
    })
    .filter(isNotNullish)
}
