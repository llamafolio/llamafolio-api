import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import request, { gql } from 'graphql-request'

const abi = {
  poolTokenShareOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'poolTokenShareOf',
    outputs: [{ internalType: 'uint256', name: 'bptClaim', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenClaimOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'tokenClaimOf',
    outputs: [
      { internalType: 'uint256', name: 'wethBalance', type: 'uint256' },
      { internalType: 'uint256', name: 'noteBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPresentValueAssetDenominated: {
    inputs: [],
    name: 'getPresentValueAssetDenominated',
    outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPresentValueUnderlyingDenominated: {
    inputs: [],
    name: 'getPresentValueUnderlyingDenominated',
    outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
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

const NOTE: Contract = {
  chain: 'ethereum',
  address: '0xCFEAead4947f0705A14ec42aC3D44129E1Ef3eD5',
  decimals: 8,
  symbol: 'NOTE',
}

export async function getNotionalBalances(
  ctx: BalancesContext,
  proxy: Contract,
  staker: Contract,
): Promise<Balance[][]> {
  const [stakeBalance, lendBalances, borrowBalances] = await Promise.all([
    getNotionalStakeBalance(ctx, proxy, staker).then((balance) => [balance]),
    getNotionalLendBalances(ctx, proxy),
    getNotionalBorrowBalances(ctx, proxy),
  ])

  return [stakeBalance, lendBalances, borrowBalances]
}

export async function getNotionalStakeBalance(
  ctx: BalancesContext,
  _proxy: Contract,
  staker: Contract,
): Promise<Balance> {
  const underlyings = [WETH, NOTE]

  const [underlyingBalances, bptBalance] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.tokenClaimOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.poolTokenShareOf }),
  ])

  underlyings.forEach((underlying, idx) => {
    underlying.amount = underlyingBalances[idx]
  })

  return { ...staker, amount: bptBalance, underlyings, rewards: undefined, category: 'stake' }
}

export async function getNotionalLendBalances(ctx: BalancesContext, proxy: Contract): Promise<Balance[]> {
  const pools: Contract[] = proxy.pools
  const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/notional-finance/mainnet-v2'
  const underlyings = pools.map((pool) => pool.underlyings?.[0])

  const GET_ACCOUNT_BALANCES = gql`
    query accountBalances($id: String!) {
      account(id: $id) {
        id
        balances {
          assetCashBalance
          nTokenBalance
          currency {
            underlyingTokenAddress
          }
        }
      }
    }
  `

  const [{ account }, totalSuppliesRes, tokenBalancesRes]: any = await Promise.all([
    request(GRAPH_URL, GET_ACCOUNT_BALANCES, { id: ctx.address }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address }) as const), abi: erc20Abi.totalSupply }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address }) as const),
      abi: abi.getPresentValueUnderlyingDenominated,
    }),
  ])

  const { balances } = account

  return mapMultiSuccessFilter(
    balances.map((_: any, i: number) => [totalSuppliesRes[i], tokenBalancesRes[i]]),

    (res, index) => {
      const underlying = pools[index].underlyings?.[0] as Contract
      const balance = balances[index]
      const { assetCashBalance, nTokenBalance, currency } = balance
      const [{ output: totalSupply }, { output: tokenBalance }] = res.inputOutputPairs

      if (!balance || !underlying) return null

      const fmtCurrency = currency.underlyingTokenAddress ?? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

      const token = underlyings.find(
        (underlying: any) => underlying.address.toLowerCase() === fmtCurrency.toLowerCase(),
      ) as Contract

      if (token) {
        return [
          {
            ...token,
            amount: calculateAmount(token, assetCashBalance, totalSupply, tokenBalance),
            underlyings: undefined,
            rewards: undefined,
            category: 'stake',
          },
          {
            ...token,
            amount: calculateAmount(token, nTokenBalance, totalSupply, tokenBalance),
            underlyings: undefined,
            rewards: undefined,
            category: 'lend',
          },
        ]
      }
    },
  )
    .filter(isNotNullish)
    .flat() as Balance[]
}

export async function getNotionalBorrowBalances(ctx: BalancesContext, proxy: Contract): Promise<Balance[]> {
  const GRAPH_URL = 'https://api.thegraph.com/subgraphs/name/notional-finance/mainnet-v2'
  const pools: Contract[] = proxy.pools
  const underlyings = pools.map((pool) => pool.underlyings?.[0])

  const GET_ACCOUNT_BALANCES = gql`
    query accountBalances($id: String!) {
      account(id: $id) {
        portfolio {
          notional
          currency {
            underlyingTokenAddress
          }
        }
      }
    }
  `

  const { account }: any = await request(GRAPH_URL, GET_ACCOUNT_BALANCES, { id: ctx.address })
  const { portfolio } = account

  return portfolio.map((folio: any) => {
    const { notional, currency } = folio

    const fmtCurrency = currency.underlyingTokenAddress ?? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

    const token = underlyings.find(
      (underlying: any) => underlying.address.toLowerCase() === fmtCurrency.toLowerCase(),
    ) as Contract

    if (token) {
      return {
        ...token,
        amount: absBigInt(calculateAmount(token, notional)),
        category: 'borrow',
      }
    }
  })
}

function absBigInt(number: bigint): bigint {
  return number < 0n ? -number : number
}

function calculateAmount(token: Contract, balance: number, totalSupply?: bigint, tokenBalance?: bigint): bigint {
  const decimals = token.decimals!
  const factor = BigInt(Math.round(balance * 10 ** (decimals - 8)))

  if (totalSupply && tokenBalance) {
    return (factor * tokenBalance) / totalSupply
  } else {
    return factor
  }
}
