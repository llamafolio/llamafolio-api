import type { Balance, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import type { Address } from 'viem'

const morphoAaveProxy: Contract = {
  chain: 'ethereum',
  address: '0x33333aea097c193e66081E930c33020272b33333',
}

const abi = {
  marketsCreated: {
    inputs: [],
    name: 'marketsCreated',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  userBorrows: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'userBorrows',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  userBorrowBalance: {
    inputs: [
      { internalType: 'address', name: 'underlying', type: 'address' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'borrowBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userCollaterals: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'userCollaterals',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  userCollateralBalance: {
    inputs: [
      { internalType: 'address', name: 'underlying', type: 'address' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'collateralBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  healthFactors: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'liquidityData',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'borrowable',
            type: 'uint256',
          },
          { internalType: 'uint256', name: 'maxDebt', type: 'uint256' },
          { internalType: 'uint256', name: 'debt', type: 'uint256' },
        ],
        internalType: 'struct Types.LiquidityData',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  supplyBalance: {
    inputs: [
      { internalType: 'address', name: 'underlying', type: 'address' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'supplyBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenName: {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  tokenSymbol: {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  tokenDecimals: {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  market: {
    inputs: [{ internalType: 'address', name: 'underlying', type: 'address' }],
    name: 'market',
    outputs: [
      {
        components: [
          {
            components: [
              {
                components: [
                  {
                    internalType: 'uint128',
                    name: 'poolIndex',
                    type: 'uint128',
                  },
                  {
                    internalType: 'uint128',
                    name: 'p2pIndex',
                    type: 'uint128',
                  },
                ],
                internalType: 'struct Types.MarketSideIndexes',
                name: 'supply',
                type: 'tuple',
              },
              {
                components: [
                  {
                    internalType: 'uint128',
                    name: 'poolIndex',
                    type: 'uint128',
                  },
                  {
                    internalType: 'uint128',
                    name: 'p2pIndex',
                    type: 'uint128',
                  },
                ],
                internalType: 'struct Types.MarketSideIndexes',
                name: 'borrow',
                type: 'tuple',
              },
            ],
            internalType: 'struct Types.Indexes',
            name: 'indexes',
            type: 'tuple',
          },
          {
            components: [
              {
                components: [
                  {
                    internalType: 'uint256',
                    name: 'scaledDelta',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'scaledP2PTotal',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct Types.MarketSideDelta',
                name: 'supply',
                type: 'tuple',
              },
              {
                components: [
                  {
                    internalType: 'uint256',
                    name: 'scaledDelta',
                    type: 'uint256',
                  },
                  {
                    internalType: 'uint256',
                    name: 'scaledP2PTotal',
                    type: 'uint256',
                  },
                ],
                internalType: 'struct Types.MarketSideDelta',
                name: 'borrow',
                type: 'tuple',
              },
            ],
            internalType: 'struct Types.Deltas',
            name: 'deltas',
            type: 'tuple',
          },
          {
            internalType: 'address',
            name: 'underlying',
            type: 'address',
          },
          {
            components: [
              {
                internalType: 'bool',
                name: 'isP2PDisabled',
                type: 'bool',
              },
              {
                internalType: 'bool',
                name: 'isSupplyPaused',
                type: 'bool',
              },
              {
                internalType: 'bool',
                name: 'isSupplyCollateralPaused',
                type: 'bool',
              },
              {
                internalType: 'bool',
                name: 'isBorrowPaused',
                type: 'bool',
              },
              {
                internalType: 'bool',
                name: 'isWithdrawPaused',
                type: 'bool',
              },
              {
                internalType: 'bool',
                name: 'isWithdrawCollateralPaused',
                type: 'bool',
              },
              {
                internalType: 'bool',
                name: 'isRepayPaused',
                type: 'bool',
              },
              {
                internalType: 'bool',
                name: 'isLiquidateCollateralPaused',
                type: 'bool',
              },
              {
                internalType: 'bool',
                name: 'isLiquidateBorrowPaused',
                type: 'bool',
              },
              { internalType: 'bool', name: 'isDeprecated', type: 'bool' },
            ],
            internalType: 'struct Types.PauseStatuses',
            name: 'pauseStatuses',
            type: 'tuple',
          },
          { internalType: 'bool', name: 'isCollateral', type: 'bool' },
          {
            internalType: 'address',
            name: 'variableDebtToken',
            type: 'address',
          },
          {
            internalType: 'uint32',
            name: 'lastUpdateTimestamp',
            type: 'uint32',
          },
          {
            internalType: 'uint16',
            name: 'reserveFactor',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'p2pIndexCursor',
            type: 'uint16',
          },
          { internalType: 'address', name: 'aToken', type: 'address' },
          {
            internalType: 'address',
            name: 'stableDebtToken',
            type: 'address',
          },
          { internalType: 'uint256', name: 'idleSupply', type: 'uint256' },
        ],
        internalType: 'struct Types.Market',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

async function getUnderlying(ctx: BaseContext) {
  const contracts: Contract[] = []
  const markets = await call({ ctx, target: morphoAaveProxy.address, abi: abi.marketsCreated })
  const calls = markets.map((market) => ({
    target: market,
  }))

  const tokenName = await multicall({ ctx, calls, abi: abi.tokenName })
  const tokenSymbol = await multicall({ ctx, calls, abi: abi.tokenSymbol })
  const tokenDecimals = await multicall({ ctx, calls, abi: abi.tokenDecimals })

  const getMarketsWithAllDetails = async (markets: `0x${string}`[]) => {
    for (let idx = 0; idx < markets.length; idx++) {
      const address = markets[idx]
      contracts.push({
        chain: ctx.chain,
        address: address,
        name: tokenName[idx].output ?? 'undefined',
        symbol: tokenSymbol[idx].output ?? 'undefined',
        decimals: Number(tokenDecimals[idx].output) ?? 'undefined',
      })
    }
  }
  const mutableMarkets: `0x${string}`[] = [...markets]

  getMarketsWithAllDetails(mutableMarkets)
  return contracts
}

async function getContractsBalance(ctx: BalancesContext, markets: Contract[]) {
  const userBorrowsAddress = await call({
    ctx,
    target: morphoAaveProxy.address,
    abi: abi.userBorrows,
    params: [ctx.address],
  })
  const userCollateralsAddress = await call({
    ctx,
    target: morphoAaveProxy.address,
    abi: abi.userCollaterals,
    params: [ctx.address],
  })

  const getBorrowBalance = async (underlying: Address[]) => {
    const balance: { underlying: string; amount: bigint }[] = []
    const borrowBalance = await multicall({
      ctx,
      calls: underlying.map((underlyingAddress) => ({
        target: morphoAaveProxy.address,
        params: [underlyingAddress, ctx.address] as const,
      })),
      abi: abi.userBorrowBalance,
    })
    for (let idx = 0; idx < borrowBalance.length; idx++) {
      balance.push({
        underlying: underlying[idx],
        amount: borrowBalance[idx].output!,
      })
    }
    return balance
  }
  const borrowBalance = await getBorrowBalance(userBorrowsAddress as Address[])
  const getCollateralBalance = async (underlying: Address[]) => {
    const balance: { underlying: string; amount: bigint }[] = []
    const collateralBalance = await multicall({
      ctx,
      calls: underlying.map((underlyingAddress) => ({
        target: morphoAaveProxy.address,
        params: [underlyingAddress, ctx.address] as const,
      })),
      abi: abi.userCollateralBalance,
    })
    for (let idx = 0; idx < collateralBalance.length; idx++) {
      balance.push({
        underlying: underlying[idx],
        amount: collateralBalance[idx].output!,
      })
    }
    return balance
  }
  const collateralBalance = await getCollateralBalance(userCollateralsAddress as Address[])
  const getSupplyBalance = async (markets: Contract[] | undefined) => {
    const balance: { underlying: string; amount: bigint }[] = []
    if (!markets) {
      return balance
    }
    const supplyBalance = await multicall({
      ctx,
      calls: markets.map((underlyingAddress: Contract) => ({
        target: morphoAaveProxy.address,
        params: [underlyingAddress.address, ctx.address] as const,
      })),
      abi: abi.supplyBalance,
    })
    for (let idx = 0; idx < supplyBalance.length; idx++) {
      const supplyAmount = supplyBalance[idx].output
      balance.push({
        underlying: markets[idx].address,
        amount: supplyAmount!,
      })
    }

    return balance
  }
  const supplyBalance = await getSupplyBalance(markets)

  const getBalance = (
    markets: Contract[],
    borrowBalance: {
      underlying: string
      amount: bigint
    }[],
    collateralBalance: {
      underlying: string
      amount: bigint
    }[],
    supplyBalance: {
      underlying: string
      amount: bigint
    }[],
  ) => {
    const balance: Balance[] = []
    for (let idx = 0; idx < markets.length; idx++) {
      const underlying = markets[idx].underlyings![0] as Contract

      for (let i = 0; i < borrowBalance.length; i++) {
        const borrowBalanceUnderlying = borrowBalance[i].underlying
        if (
          (underlying.address as string).toLocaleLowerCase() === (borrowBalanceUnderlying as string).toLocaleLowerCase()
        ) {
          const marketBalance: Balance = {
            ...markets[idx],
            underlyings: [underlying],
            amount: borrowBalance[i].amount,
            category: 'borrow',
            rewards: undefined,
            stable: underlying.stable,
          }
          balance.push(marketBalance)
        }
      }
      for (let i = 0; i < collateralBalance.length; i++) {
        const collateralBalanceUnderlying = collateralBalance[i].underlying
        if (
          (underlying.address as string).toLocaleLowerCase() ===
          (collateralBalanceUnderlying as string).toLocaleLowerCase()
        ) {
          const marketBalance: Balance = {
            ...markets[idx],
            underlyings: [underlying],
            amount: collateralBalance[i].amount,
            category: 'lend',
            rewards: undefined,
            stable: underlying.stable,
          }
          balance.push(marketBalance)
        }
      }
      for (let i = 0; i < supplyBalance.length; i++) {
        const supplyBalanceUnderlying = supplyBalance[i].underlying
        if (
          (underlying.address as string).toLocaleLowerCase() === (supplyBalanceUnderlying as string).toLocaleLowerCase()
        ) {
          const marketBalance: Balance = {
            ...markets[idx],
            underlyings: [underlying],
            amount: supplyBalance[i].amount,
            category: 'lend',
            rewards: undefined,
            stable: underlying.stable,
          }
          balance.push(marketBalance)
        }
      }
    }
    return balance
  }
  const balance = getBalance(markets, borrowBalance, collateralBalance, supplyBalance)
  return balance
}

async function getHealthFacter(ctx: BalancesContext) {
  const liquidityData = await call({
    ctx,
    target: morphoAaveProxy.address,
    params: [ctx.address],
    abi: abi.healthFactors,
  })
  return Number(liquidityData.maxDebt) / Number(liquidityData.debt)
}

export const getContracts = async (ctx: BaseContext) => {
  const underlying = await getUnderlying(ctx)
  const markets = await multicall({
    ctx,
    calls: underlying.map((underlyingAddress) => ({
      target: morphoAaveProxy.address,
      params: [underlyingAddress.address] as const,
    })),
    abi: abi.market,
  })
  const marketsData: Contract[] = []
  for (let idx = 0; idx < markets.length; idx++) {
    marketsData.push({
      chain: 'ethereum',
      address: markets[idx].output!.aToken,
      underlyings: [markets[idx].output!.underlying],
    })
  }
  return {
    contracts: { marketsData },
    revalidate: 12 * 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      marketsData: (ctx, contracts) => getContractsBalance(ctx, contracts),
    }),
    getHealthFacter(ctx),
  ])
  await getContractsBalance(ctx, contracts.marketsData as Contract[])
  await getHealthFacter(ctx)
  return {
    groups: [{ balances, healthFactor }],
  }
}
