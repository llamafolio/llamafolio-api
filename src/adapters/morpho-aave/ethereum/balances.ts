import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber, ethers } from 'ethers'

const abi = {
  getAllMarkets: {
    inputs: [],
    name: 'getAllMarkets',
    outputs: [{ internalType: 'address[]', name: 'marketsCreated', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlyings_assets: {
    inputs: [],
    name: 'UNDERLYING_ASSET_ADDRESS',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getCurrentSupplyBalanceInOf: {
    inputs: [
      { internalType: 'address', name: '_poolToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'getCurrentSupplyBalanceInOf',
    outputs: [
      { internalType: 'uint256', name: 'balanceInP2P', type: 'uint256' },
      { internalType: 'uint256', name: 'balanceOnPool', type: 'uint256' },
      { internalType: 'uint256', name: 'totalBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getCurrentBorrowBalanceInOf: {
    inputs: [
      { internalType: 'address', name: '_poolToken', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'getCurrentBorrowBalanceInOf',
    outputs: [
      { internalType: 'uint256', name: 'balanceInP2P', type: 'uint256' },
      { internalType: 'uint256', name: 'balanceOnPool', type: 'uint256' },
      { internalType: 'uint256', name: 'totalBalance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getUserHealthFactor: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUserHealthFactor',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getMarketsContracts(ctx: BaseContext, lens: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const marketsContractsRes = await call({
    ctx,
    target: lens.address,
    params: [],
    abi: abi.getAllMarkets,
  })

  const underlyingsRes = await multicall({
    ctx,
    calls: marketsContractsRes.output.map((token: string) => ({
      target: token,
      params: [],
    })),
    abi: abi.underlyings_assets,
  })

  for (let idx = 0; idx < underlyingsRes.length; idx++) {
    const market = marketsContractsRes.output[idx]
    const underlying = underlyingsRes[idx]

    if (!isSuccess(underlying)) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: market,
      underlyings: [underlying.output],
    })
  }

  return contracts
}

export async function getLendBorrowBalances(
  ctx: BalancesContext,
  markets: Contract[],
  lens: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls = markets.map((market) => ({
    target: lens.address,
    params: [market.address, ctx.address],
  }))

  const [lendBalancesRes, borrowBalancesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getCurrentSupplyBalanceInOf }),
    multicall({ ctx, calls, abi: abi.getCurrentBorrowBalanceInOf }),
  ])

  for (let marketIdx = 0; marketIdx < markets.length; marketIdx++) {
    const market = markets[marketIdx]
    const lendBalanceRes = lendBalancesRes[marketIdx]
    const borrowBalanceRes = borrowBalancesRes[marketIdx]
    const underlyings = market.underlyings?.[0] as Contract

    if (isSuccess(lendBalanceRes)) {
      balances.push({
        ...market,
        decimals: underlyings.decimals,
        amount: BigNumber.from(lendBalanceRes.output.totalBalance),
        underlyings: [underlyings],
        rewards: undefined,
        category: 'lend',
      })
    }

    balances.push({
      ...market,
      chain: ctx.chain,
      address: market.address,
      decimals: underlyings.decimals,
      symbol: market.symbol,
      amount: BigNumber.from(borrowBalanceRes.output.totalBalance),
      underlyings: [underlyings],
      rewards: undefined,
      category: 'borrow',
    })
  }

  return balances
}

export async function getUserHealthFactor(ctx: BalancesContext, morphoLens: Contract): Promise<number | undefined> {
  const userHealthFactorRes = await call({
    ctx,
    target: morphoLens.address,
    params: [ctx.address],
    abi: abi.getUserHealthFactor,
  })

  if (ethers.constants.MaxUint256.eq(userHealthFactorRes.output)) {
    return
  }

  return userHealthFactorRes.output / 1e18
}
