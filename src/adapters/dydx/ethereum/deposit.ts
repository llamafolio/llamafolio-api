import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getNumMarkets: {
    constant: true,
    inputs: [],
    name: 'getNumMarkets',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getMarketTokenAddress: {
    constant: true,
    inputs: [{ name: 'marketId', type: 'uint256' }],
    name: 'getMarketTokenAddress',
    outputs: [{ name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getAccountWei: {
    constant: true,
    inputs: [
      {
        components: [
          { name: 'owner', type: 'address' },
          { name: 'number', type: 'uint256' },
        ],
        name: 'account',
        type: 'tuple',
      },
      { name: 'marketId', type: 'uint256' },
    ],
    name: 'getAccountWei',
    outputs: [
      {
        components: [
          { name: 'sign', type: 'bool' },
          { name: 'value', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getDepositMarkets(ctx: BaseContext, staker: Contract): Promise<Contract[]> {
  const marketsLength = await call({ ctx, target: staker.address, abi: abi.getNumMarkets })

  const marketsAddressesRes = await multicall({
    ctx,
    calls: rangeBI(0n, marketsLength).map((idx) => ({ target: staker.address, params: [idx] } as const)),
    abi: abi.getMarketTokenAddress,
  })

  return mapSuccessFilter(marketsAddressesRes, (address, idx) => ({
    chain: ctx.chain,
    address: address.output,
    pid: idx,
  }))
}

export async function getDepositBalances(
  ctx: BalancesContext,
  markets: Contract[],
  staker: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const balancesOfsRes = await multicall({
    ctx,
    calls: markets.map(
      (market) => ({ target: staker.address, params: [{ owner: ctx.address, number: 0n }, market.pid] } as const),
    ),
    abi: abi.getAccountWei,
  })

  for (let marketIdx = 0; marketIdx < markets.length; marketIdx++) {
    const market = markets[marketIdx]
    const balancesOfRes = balancesOfsRes[marketIdx]

    if (!balancesOfRes.success) {
      continue
    }

    balances.push({
      ...staker,
      decimals: market.decimals,
      symbol: market.symbol,
      amount: balancesOfRes.output.value,
      underlyings: [market],
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}
