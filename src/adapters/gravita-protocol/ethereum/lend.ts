import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getVesselColl: {
    inputs: [
      {
        internalType: 'address',
        name: '_asset',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_borrower',
        type: 'address',
      },
    ],
    name: 'getVesselColl',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getVesselDebt: {
    inputs: [
      {
        internalType: 'address',
        name: '_asset',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_borrower',
        type: 'address',
      },
    ],
    name: 'getVesselDebt',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const GRAI: Token = {
  chain: 'ethereum',
  address: '0x15f74458aE0bFdAA1a96CA1aa779D715Cc1Eefe4',
  decimals: 18,
  symbol: 'GRAI',
}

const tokens: Token[] = [
  { chain: 'ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
  { chain: 'ethereum', address: '0xae78736Cd615f374D3085123A210448E74Fc6393', symbol: 'rETH', decimals: 18 },
  { chain: 'ethereum', address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', symbol: 'wstETH', decimals: 18 },
  { chain: 'ethereum', address: '0xB9D7DdDca9a4AC480991865EfEf82E01273F79C3', symbol: 'bLUSD', decimals: 18 },
]

export async function getGravitaLendBalances(
  ctx: BalancesContext,
  _borrowerOperations: Contract,
  vessel: Contract,
): Promise<Balance[] | undefined> {
  const balances: Balance[] = []

  const [userColls, userDebts] = await Promise.all([
    multicall({
      ctx,
      calls: tokens.map(
        (token) =>
          ({
            target: vessel.address,
            params: [token.address, ctx.address],
          } as const),
      ),
      abi: abi.getVesselColl,
    }),
    multicall({
      ctx,
      calls: tokens.map(
        (token) =>
          ({
            target: vessel.address,
            params: [token.address, ctx.address],
          } as const),
      ),
      abi: abi.getVesselDebt,
    }),
  ])

  for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
    const token = tokens[tokenIdx]
    const userColl = userColls[tokenIdx]
    const userDebt = userDebts[tokenIdx]

    if (!userColl.success || !userDebt.success) {
      continue
    }

    balances.push({
      ...token,
      amount: userColl.output,
      underlyings: undefined,
      rewards: undefined,
      category: 'lend',
    })

    balances.push({
      ...GRAI,
      amount: userDebt.output,
      underlyings: undefined,
      rewards: undefined,
      category: 'borrow',
    })
  }

  return balances
}
