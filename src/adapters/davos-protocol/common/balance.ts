import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'

const abi = {
  locked: {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'usr', type: 'address' },
    ],
    name: 'locked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  borrowed: {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'address', name: 'usr', type: 'address' },
    ],
    name: 'borrowed',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  collateralRate: {
    inputs: [{ internalType: 'address', name: 'token', type: 'address' }],
    name: 'collateralRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const DUSD: { [key: string]: Contract } = {
  ethereum: { chain: 'ethereum', address: '0xa48f322f8b3edff967629af79e027628b9dd1298', decimals: 18, symbol: 'DUSD' },
  arbitrum: { chain: 'arbitrum', address: '0x8ec1877698acf262fe8ad8a295ad94d6ea258988', decimals: 18, symbol: 'DUSD' },
  optimism: { chain: 'optimism', address: '0xb396b31599333739a97951b74652c117be86ee1d', decimals: 18, symbol: 'DUSD' },
  polygon: { chain: 'polygon', address: '0xec38621e72d86775a89c7422746de1f52bba5320', decimals: 18, symbol: 'DUSD' },
}

export async function getDavosLendingBalances(ctx: BalancesContext, vaults: Contract[]): Promise<any[]> {
  const [collaterals, borrows, collRates] = await Promise.all([
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address, params: [vault.token!, ctx.address] }) as const),
      abi: abi.locked,
    }),
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address, params: [vault.token!, ctx.address] }) as const),
      abi: abi.borrowed,
    }),
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address, params: [vault.token!] }) as const),
      abi: abi.collateralRate,
    }),
  ])

  return mapMultiSuccessFilter(
    collaterals.map((_, i) => [collaterals[i], borrows[i], collRates[i]]),

    (res, index) => {
      const vault = vaults[index]
      const [{ output: coll }, { output: borrow }, { output: collRate }] = res.inputOutputPairs

      const MCR = 1 / parseFloatBI(collRate, 18)

      const lendBalance: Balance = {
        ...vault,
        amount: coll,
        underlyings: vault.underlyings as Contract[],
        rewards: undefined,
        MCR,
        category: 'lend',
      }

      const borrowBalance: Balance = {
        ...DUSD[ctx.chain],
        amount: borrow,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return { balances: [lendBalance, borrowBalance] }
    },
  )
}
