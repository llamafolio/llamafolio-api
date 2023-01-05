import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
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

export async function getLendContracts(ctx: BaseContext, morhoLens: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const marketsContractsRes = await call({
    ctx,
    target: morhoLens.address,
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

  for (let Idx = 0; Idx < underlyingsRes.length; Idx++) {
    const marketsContracts = marketsContractsRes.output[Idx]
    const underlying = underlyingsRes[Idx]

    if (!isSuccess(underlying)) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: marketsContracts,
      underlyings: [underlying.output],
    })
  }

  return contracts
}

export async function getLendBorrowBalances(
  ctx: BalancesContext,
  markets: Contract[],
  morphoLens: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []
  const lend: Balance[] = []
  const borrow: Balance[] = []

  const calls = markets.map((market) => ({
    target: morphoLens.address,
    params: [market.address, ctx.address],
  }))

  const [lendBalancesRes, borrowBalancesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.getCurrentSupplyBalanceInOf }),
    multicall({ ctx, calls, abi: abi.getCurrentBorrowBalanceInOf }),
  ])

  const lendBalances = lendBalancesRes.filter(isSuccess).map((res) => BigNumber.from(res.output.totalBalance))
  const borrowBalances = borrowBalancesRes.filter(isSuccess).map((res) => BigNumber.from(res.output.totalBalance))

  for (let Idx = 0; Idx < markets.length; Idx++) {
    const market = markets[Idx]
    const lendBalance = lendBalances[Idx]
    const borrowBalance = borrowBalances[Idx]
    const underlyings = market.underlyings?.[0] as Contract

    lend.push({
      ...market,
      chain: ctx.chain,
      address: market.address,
      decimals: underlyings.decimals,
      symbol: market.symbol,
      amount: lendBalance,
      underlyings: [underlyings],
      rewards: undefined,
      category: 'lend',
    })

    borrow.push({
      ...market,
      chain: ctx.chain,
      address: market.address,
      decimals: underlyings.decimals,
      symbol: market.symbol,
      amount: borrowBalance,
      underlyings: [underlyings],
      rewards: undefined,
      category: 'borrow',
    })
  }

  balances.push(...lend, ...borrow)

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
