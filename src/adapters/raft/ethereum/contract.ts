import type { BaseContext, Contract } from '@lib/adapter'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'

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

export async function getRaftContracts(ctx: BaseContext, manager: Contract, assets: Contract[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const collateralInfosRes = await multicall({
    ctx,
    calls: assets.map((asset) => ({ target: manager.address, params: [asset.address] }) as const),
    abi: abi.collateralInfo,
  })

  for (const [index, asset] of assets.entries()) {
    const collateralInfoRes = collateralInfosRes[index]

    if (!collateralInfoRes.success) continue

    const [collateralToken, debtToken] = collateralInfoRes.output

    contracts.push({
      chain: ctx.chain,
      address: collateralToken,
      manager: manager.address,
      token: collateralToken,
      underlyings: [asset],
      debt: await getERC20Details(ctx, [debtToken]),
    })
  }

  return contracts
}
