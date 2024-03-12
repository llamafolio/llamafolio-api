import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getBalancesOf } from '@lib/erc20'
import { isNotNullish } from '@lib/type'

const abi = {
  getAccountOrders: {
    inputs: [
      { internalType: 'contract DataStore', name: 'dataStore', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'start', type: 'uint256' },
      { internalType: 'uint256', name: 'end', type: 'uint256' },
    ],
    name: 'getAccountOrders',
    outputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'account', type: 'address' },
              { internalType: 'address', name: 'receiver', type: 'address' },
              { internalType: 'address', name: 'callbackContract', type: 'address' },
              { internalType: 'address', name: 'uiFeeReceiver', type: 'address' },
              { internalType: 'address', name: 'market', type: 'address' },
              { internalType: 'address', name: 'initialCollateralToken', type: 'address' },
              { internalType: 'address[]', name: 'swapPath', type: 'address[]' },
            ],
            internalType: 'struct Order.Addresses',
            name: 'addresses',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'enum Order.OrderType', name: 'orderType', type: 'uint8' },
              {
                internalType: 'enum Order.DecreasePositionSwapType',
                name: 'decreasePositionSwapType',
                type: 'uint8',
              },
              { internalType: 'uint256', name: 'sizeDeltaUsd', type: 'uint256' },
              { internalType: 'uint256', name: 'initialCollateralDeltaAmount', type: 'uint256' },
              { internalType: 'uint256', name: 'triggerPrice', type: 'uint256' },
              { internalType: 'uint256', name: 'acceptablePrice', type: 'uint256' },
              { internalType: 'uint256', name: 'executionFee', type: 'uint256' },
              { internalType: 'uint256', name: 'callbackGasLimit', type: 'uint256' },
              { internalType: 'uint256', name: 'minOutputAmount', type: 'uint256' },
              { internalType: 'uint256', name: 'updatedAtBlock', type: 'uint256' },
            ],
            internalType: 'struct Order.Numbers',
            name: 'numbers',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'bool', name: 'isLong', type: 'bool' },
              { internalType: 'bool', name: 'shouldUnwrapNativeToken', type: 'bool' },
              { internalType: 'bool', name: 'isFrozen', type: 'bool' },
            ],
            internalType: 'struct Order.Flags',
            name: 'flags',
            type: 'tuple',
          },
        ],
        internalType: 'struct Order.Props[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getAccountPositions: {
    inputs: [
      { internalType: 'contract DataStore', name: 'dataStore', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'uint256', name: 'start', type: 'uint256' },
      { internalType: 'uint256', name: 'end', type: 'uint256' },
    ],
    name: 'getAccountPositions',
    outputs: [
      {
        components: [
          {
            components: [
              { internalType: 'address', name: 'account', type: 'address' },
              { internalType: 'address', name: 'market', type: 'address' },
              { internalType: 'address', name: 'collateralToken', type: 'address' },
            ],
            internalType: 'struct Position.Addresses',
            name: 'addresses',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'uint256', name: 'sizeInUsd', type: 'uint256' },
              { internalType: 'uint256', name: 'sizeInTokens', type: 'uint256' },
              { internalType: 'uint256', name: 'collateralAmount', type: 'uint256' },
              { internalType: 'uint256', name: 'borrowingFactor', type: 'uint256' },
              { internalType: 'uint256', name: 'fundingFeeAmountPerSize', type: 'uint256' },
              { internalType: 'uint256', name: 'longTokenClaimableFundingAmountPerSize', type: 'uint256' },
              { internalType: 'uint256', name: 'shortTokenClaimableFundingAmountPerSize', type: 'uint256' },
              { internalType: 'uint256', name: 'increasedAtBlock', type: 'uint256' },
              { internalType: 'uint256', name: 'decreasedAtBlock', type: 'uint256' },
            ],
            internalType: 'struct Position.Numbers',
            name: 'numbers',
            type: 'tuple',
          },
          {
            components: [{ internalType: 'bool', name: 'isLong', type: 'bool' }],
            internalType: 'struct Position.Flags',
            name: 'flags',
            type: 'tuple',
          },
        ],
        internalType: 'struct Position.Props[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getGMXBalances(
  ctx: BalancesContext,
  router: Contract,
  reader: Contract,
  dataStore: Contract,
): Promise<Balance[]> {
  const markets = router.markets as Contract[]

  const [lpBalances, stakeBalances] = await Promise.all([
    getGMXLpBalances(ctx, markets),
    getGMXDepositBalances(ctx, markets, reader, dataStore),
  ])

  return [...stakeBalances, ...lpBalances]
}

async function getGMXLpBalances(ctx: BalancesContext, markets: Contract[]): Promise<Balance[]> {
  return (await getBalancesOf(ctx, markets)).map((market) => ({ ...market, category: 'lp' }))
}

async function getGMXDepositBalances(
  ctx: BalancesContext,
  markets: Contract[],
  reader: Contract,
  dataStore: Contract,
): Promise<Balance[]> {
  const accountOrders = await call({
    ctx,
    target: reader.address,
    params: [dataStore.address, ctx.address, 0n, 100n],
    abi: abi.getAccountOrders,
  })

  return accountOrders
    .map((order) => {
      const { addresses, numbers } = order
      const { market } = addresses
      const { initialCollateralDeltaAmount } = numbers

      const matchingMarket: Contract | undefined = markets.find((m) => m.address.toLowerCase() === market.toLowerCase())
      if (!matchingMarket) return null

      return {
        ...matchingMarket,
        token: matchingMarket.longToken.address,
        amount: initialCollateralDeltaAmount,
        underlyings: undefined,
        category: 'stake',
      }
    })
    .filter(isNotNullish)
}
