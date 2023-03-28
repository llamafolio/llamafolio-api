import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  borrowBalanceOf: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'borrowBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getAssetInfo: {
    inputs: [{ internalType: 'uint8', name: 'i', type: 'uint8' }],
    name: 'getAssetInfo',
    outputs: [
      {
        components: [
          { internalType: 'uint8', name: 'offset', type: 'uint8' },
          { internalType: 'address', name: 'asset', type: 'address' },
          { internalType: 'address', name: 'priceFeed', type: 'address' },
          { internalType: 'uint64', name: 'scale', type: 'uint64' },
          {
            internalType: 'uint64',
            name: 'borrowCollateralFactor',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'liquidateCollateralFactor',
            type: 'uint64',
          },
          {
            internalType: 'uint64',
            name: 'liquidationFactor',
            type: 'uint64',
          },
          { internalType: 'uint128', name: 'supplyCap', type: 'uint128' },
        ],
        internalType: 'struct CometCore.AssetInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  numAssets: {
    inputs: [],
    name: 'numAssets',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  userCollateral: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userCollateral',
    outputs: [
      { internalType: 'uint128', name: 'balance', type: 'uint128' },
      { internalType: 'uint128', name: '_reserved', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

type BalanceWithExtraProps = Balance & {
  collateralFactor: string
}

export async function getAssetsContracts(ctx: BaseContext, compounders: Contract[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const numberOfAssets = await multicall({
    ctx,
    calls: compounders.map((contract) => ({ target: contract.address })),
    abi: abi.numAssets,
  })

  const assetsInfoRes = await multicall({
    ctx,
    calls: numberOfAssets.flatMap((numberOfAsset) =>
      isSuccess(numberOfAsset)
        ? range(0, numberOfAsset.output).map((_, idx) => ({ target: numberOfAsset.input.target, params: [idx] }))
        : null,
    ),
    abi: abi.getAssetInfo,
  })

  for (let contractIdx = 0; contractIdx < compounders.length; contractIdx++) {
    for (let i = 0; i < assetsInfoRes.length; i++) {
      const assetInfoRes = assetsInfoRes[i]

      if (!isSuccess(assetInfoRes)) {
        continue
      }

      contracts.push({
        chain: ctx.chain,
        address: assetInfoRes.output.asset,
        compounder: assetInfoRes.input.target,
        collateralFactor: assetInfoRes.output.borrowCollateralFactor,
      })
    }
  }

  return contracts
}

export async function getLendBorrowBalances(
  ctx: BalancesContext,
  assets: Contract[],
  compounders: Contract[],
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userCollateralBalancesRes, userBorrowBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: assets.map((asset) => ({
        target: asset.compounder,
        params: [ctx.address, asset.address],
      })),
      abi: abi.userCollateral,
    }),

    multicall({
      ctx,
      calls: compounders.map((contract) => ({
        target: contract.address,
        params: [ctx.address],
      })),
      abi: abi.borrowBalanceOf,
    }),
  ])

  for (let supplyIdx = 0; supplyIdx < assets.length; supplyIdx++) {
    const asset = assets[supplyIdx]
    const userCollateralBalanceRes = userCollateralBalancesRes[supplyIdx]

    if (!isSuccess(userCollateralBalanceRes)) {
      continue
    }

    const supplyBalances: BalanceWithExtraProps = {
      chain: ctx.chain,
      decimals: asset.decimals,
      symbol: asset.symbol,
      address: asset.address,
      amount: BigNumber.from(userCollateralBalanceRes.output.balance),
      collateralFactor: asset.collateralFactor,
      category: 'lend',
    }

    balances.push(supplyBalances)
  }

  for (let borrowIdx = 0; borrowIdx < compounders.length; borrowIdx++) {
    const compounder = compounders[borrowIdx]
    const underlying = compounder.underlyings?.[0] as Contract
    const userBorrowBalanceRes = userBorrowBalancesRes[borrowIdx]

    if (!underlying || !isSuccess(userBorrowBalanceRes)) {
      continue
    }

    balances.push({
      chain: ctx.chain,
      decimals: underlying.decimals,
      symbol: underlying.symbol,
      address: underlying.address,
      amount: BigNumber.from(userBorrowBalanceRes.output),
      category: 'borrow',
    })
  }

  return balances
}
