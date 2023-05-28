import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abiTRU = {
  claimable: {
    inputs: [
      {
        internalType: 'contract IERC20',
        name: 'token',
        type: 'address',
      },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolValue: {
    inputs: [],
    name: 'poolValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const TRU: Token = {
  chain: 'ethereum',
  address: '0x4c19596f5aaff459fa38b0f7ed92f11ae6543784',
  symbol: 'TRU',
  decimals: 8,
}

const TrueUSD: Token = {
  chain: 'ethereum',
  address: '0x0000000000085d4780B73119b644AE5ecd22b376',
  symbol: 'TUSD',
  decimals: 18,
}

export async function getTRUStakeBalances(ctx: BalancesContext, stkTRU: Contract) {
  const balances: Balance[] = []

  const [balanceOfRes, claimableRes] = await Promise.all([
    call({
      ctx,
      target: stkTRU.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    call({
      ctx,
      target: stkTRU.address,
      params: [ctx.address, TRU.address],
      abi: abiTRU.claimable,
    }),
  ])

  const balanceOf = balanceOfRes
  const claimable = claimableRes

  balances.push({
    chain: ctx.chain,
    address: stkTRU.address,
    decimals: stkTRU.decimals,
    symbol: stkTRU.symbol,
    amount: balanceOf,
    underlyings: [TRU],
    rewards: [{ ...TRU, amount: claimable }],
    category: 'stake',
  })

  return balances
}

export async function getTUSDStakeBalances(ctx: BalancesContext, TUSD: Contract) {
  const balances: Balance[] = []

  const [balanceOfRes, poolValueRes, totalSupplyRes] = await Promise.all([
    call({
      ctx,
      target: TUSD.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    call({
      ctx,
      target: TUSD.address,
      abi: abiTRU.poolValue,
    }),

    call({
      ctx,
      target: TUSD.address,
      abi: abiTRU.totalSupply,
    }),
  ])

  const balanceOf = balanceOfRes
  const poolValue = poolValueRes
  const totalSupply = totalSupplyRes

  balances.push({
    chain: ctx.chain,
    address: TUSD.address,
    decimals: TUSD.decimals,
    symbol: TUSD.symbol,
    amount: (balanceOf * poolValue) / totalSupply,
    underlyings: [TrueUSD],
    category: 'stake',
  })

  return balances
}
