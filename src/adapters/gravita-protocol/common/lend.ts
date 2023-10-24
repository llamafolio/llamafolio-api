import type { BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getVesselColl: {
    inputs: [
      { internalType: 'address', name: '_asset', type: 'address' },
      { internalType: 'address', name: '_borrower', type: 'address' },
    ],
    name: 'getVesselColl',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getVesselDebt: {
    inputs: [
      { internalType: 'address', name: '_asset', type: 'address' },
      { internalType: 'address', name: '_borrower', type: 'address' },
    ],
    name: 'getVesselDebt',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

// https://docs.gravitaprotocol.com/gravita-docs/how-does-gravita-work/vessels-and-collateral
const LTVs: { [key: string]: number } = {
  // eth
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 0.9,
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 0.9,
  // lst eth
  '0xae78736cd615f374d3085123a210448e74fc6393': 0.85,
  '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': 0.85,
  '0xf951e335afb289353dc249e82926178eac7ded78': 0.85,
  '0xac3e018457b222d93114458476f3e3416abbe38f': 0.85,
  '0xa35b1b31ce002fbf2058d22f30f95d405200a15b': 0.85,
  '0x5979d7b546e38e414f7e9822514be443a4800529': 0.85,
  '0xec70dcb4a1efa46b8f2d97c310c9c4790ba5ffa8': 0.85,
  '0x95ab45875cffdba1e5f451b950bc2e42c0053f39': 0.85,
  // stable
  '0xb9d7dddca9a4ac480991865efef82e01273f79c3': 0.99,
  '0x8ffdf2de812095b1d19cb146e4c004587c0a0692': 0.99,
}

const GRAI: { [key: string]: Token } = {
  ethereum: {
    chain: 'ethereum',
    address: '0x15f74458aE0bFdAA1a96CA1aa779D715Cc1Eefe4',
    decimals: 18,
    symbol: 'GRAI',
  },
  arbitrum: {
    chain: 'arbitrum',
    address: '0x894134a25a5faC1c2C26F1d8fBf05111a3CB9487',
    decimals: 18,
    symbol: 'GRAI',
  },
}

export async function getGravitaLendBalances(ctx: BalancesContext, assets: Contract[], vessel: Contract) {
  const [userColls, userDebts] = await Promise.all([
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: vessel.address, params: [asset.address, ctx.address] }) as const),
      abi: abi.getVesselColl,
    }),
    multicall({
      ctx,
      calls: assets.map((asset) => ({ target: vessel.address, params: [asset.address, ctx.address] }) as const),
      abi: abi.getVesselDebt,
    }),
  ])

  return mapMultiSuccessFilter(
    userColls.map((_, i) => [userColls[i], userDebts[i]]),

    (res, index) => {
      const asset = assets[index]
      const [{ output: coll }, { output: debt }] = res.inputOutputPairs

      const lend: LendBalance = {
        ...asset,
        amount: coll,
        underlyings: undefined,
        rewards: undefined,
        // MCR = 1 / LTV
        MCR: LTVs[asset.address] ? 1 / LTVs[asset.address] : undefined,
        category: 'lend',
      }

      const borrow: BorrowBalance = {
        ...GRAI[ctx.chain],
        amount: debt,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return { balances: [lend, borrow] }
    },
  )
}
