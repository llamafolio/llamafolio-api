import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getERC20Details } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  collateralInfo: {
    inputs: [
      {
        internalType: 'contract IERC20',
        name: 'collateralToken',
        type: 'address',
      },
    ],
    name: 'collateralInfo',
    outputs: [
      {
        internalType: 'contract IERC20Indexable',
        name: 'collateralToken',
        type: 'address',
      },
      {
        internalType: 'contract IERC20Indexable',
        name: 'debtToken',
        type: 'address',
      },
      {
        internalType: 'contract IPriceFeed',
        name: 'priceFeed',
        type: 'address',
      },
      {
        internalType: 'contract ISplitLiquidationCollateral',
        name: 'splitLiquidation',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'isEnabled',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'lastFeeOperationTime',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'borrowingSpread',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'baseRate',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'redemptionSpread',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'redemptionRebate',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const wstETH: Token = {
  chain: 'ethereum',
  address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
  decimals: 18,
  symbol: 'wstETH',
}

export async function getRaftContracts(ctx: BaseContext, manager: Contract): Promise<Contract> {
  const [
    collateralToken,
    debtToken,
    _priceFeed,
    _splitLiquidation,
    _isEnabled,
    _lastFeeOperationTime,
    _borrowingSpread,
    _baseRate,
    _redemptionSpread,
    _redemptionRebate,
  ] = await call({ ctx, target: manager.address, params: [wstETH.address], abi: abi.collateralInfo })

  return {
    chain: ctx.chain,
    address: manager.address,
    token: collateralToken,
    underlyings: undefined,
    debt: await getERC20Details(ctx, [debtToken]),
  }
}
