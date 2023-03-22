import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
}

export async function getDepositMarkets(ctx: BaseContext, staker: Contract): Promise<Contract[]> {
  const { output: marketsLength } = await call({ ctx, target: staker.address, abi: abi.getNumMarkets })

  const marketsAddressesRes = await multicall({
    ctx,
    calls: range(0, marketsLength).map((idx: number) => ({ target: staker.address, params: [idx] })),
    abi: abi.getMarketTokenAddress,
  })

  return (marketsAddressesRes || []).map((address, idx) => ({ chain: ctx.chain, address: address.output, pid: idx }))
}

export async function getDepositBalances(
  ctx: BalancesContext,
  markets: Contract[],
  staker: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const balancesOfsRes = await multicall({
    ctx,
    calls: markets.map((market) => ({ target: staker.address, params: [[ctx.address, '0'], market.pid] })),
    abi: abi.getAccountWei,
  })

  for (let marketIdx = 0; marketIdx < markets.length; marketIdx++) {
    const market = markets[marketIdx]
    const balancesOfRes = balancesOfsRes[marketIdx]

    if (!isSuccess(balancesOfRes)) {
      continue
    }

    balances.push({
      ...staker,
      decimals: market.decimals,
      symbol: market.symbol,
      amount: BigNumber.from(balancesOfRes.output.value),
      underlyings: [market],
      rewards: undefined,
      category: 'stake',
    })
  }

  return balances
}
