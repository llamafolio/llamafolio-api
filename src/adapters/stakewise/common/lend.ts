import type { BalancesContext, BaseContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  getShares: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'getShares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  convertToAssets: {
    inputs: [{ internalType: 'uint256', name: 'shares', type: 'uint256' }],
    name: 'convertToAssets',
    outputs: [{ internalType: 'uint256', name: 'assets', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  osTokenPositions: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'osTokenPositions',
    outputs: [{ internalType: 'uint128', name: 'shares', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

const osETH: Contract = {
  chain: 'ethereum',
  address: '0xf1c9acdc66974dfb6decb12aa385b9cd01190e38',
  decimals: 18,
  symbol: 'osETH',
}

export function getStakeWiseLendContracts(ctx: BaseContext, lendAddresses: `0x${string}`[]): Contract[] {
  return lendAddresses.map((lend) => ({ chain: ctx.chain, address: lend, token: WETH.address }))
}

export async function getStakeWiseLendBalances(ctx: BalancesContext, lenders: Contract[]) {
  const userShares = await multicall({
    ctx,
    calls: lenders.map((lend) => ({ target: lend.address, params: [ctx.address] }) as const),
    abi: abi.getShares,
  })

  const [userAssets, usetOTokens] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(userShares, (res) => ({ target: res.input.target, params: [res.output] }) as const),
      abi: abi.convertToAssets,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(userShares, (res) => ({ target: res.input.target, params: [ctx.address] }) as const),
      abi: abi.osTokenPositions,
    }),
  ])

  return mapMultiSuccessFilter(
    userAssets.map((_, i) => [userAssets[i], usetOTokens[i]]),

    (res, index) => {
      const lender = lenders[index]
      const [{ output: userAsset }, { output: usetOToken }] = res.inputOutputPairs

      const lendBalance: LendBalance = {
        ...lender,
        amount: userAsset,
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
      }

      const borrowBalance: BorrowBalance = {
        ...osETH,
        amount: usetOToken,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return { balances: [lendBalance, borrowBalance] }
    },
  )
}
