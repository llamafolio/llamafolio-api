import type { BaseContext, Contract } from '@lib/adapter'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  idToMarketParams: {
    inputs: [{ internalType: 'Id', name: '', type: 'bytes32' }],
    name: 'idToMarketParams',
    outputs: [
      { internalType: 'address', name: 'loanToken', type: 'address' },
      { internalType: 'address', name: 'collateralToken', type: 'address' },
      { internalType: 'address', name: 'oracle', type: 'address' },
      { internalType: 'address', name: 'irm', type: 'address' },
      { internalType: 'uint256', name: 'lltv', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface AssetInfo {
  id: `0x${string}`
  collateralToken: `0x${string}`
  debtToken: `0x${string}`
  ltv: bigint
}

export async function getMorphoAssets(
  ctx: BaseContext,
  comptroller: Contract,
  poolIds: `0x${string}`[],
): Promise<Contract> {
  const assetsParamsRes = await fetchAssetsParams(ctx, comptroller, poolIds)

  const assetsInfo = assetsParamsRes.map((res, index) => {
    const { loanToken, collateralToken, lltv } = extractTokensAndLtv(res)
    return {
      id: poolIds[index],
      collateralToken: collateralToken,
      debtToken: loanToken,
      ltv: lltv,
    }
  })

  const [collateralTokensDetails, debtTokensDetails] = await Promise.all([
    getERC20Details(
      ctx,
      assetsInfo.map((a) => a.collateralToken),
    ),
    getERC20Details(
      ctx,
      assetsInfo.map((a) => a.debtToken),
    ),
  ])

  assetsInfo.forEach((asset, index) => {
    addToComptroller(comptroller, asset, collateralTokensDetails[index], debtTokensDetails[index])
  })

  return comptroller
}

async function fetchAssetsParams(ctx: BaseContext, comptroller: Contract, poolIds: `0x${string}`[]) {
  return multicall({
    ctx,
    calls: poolIds.map((id) => ({ target: comptroller.address, params: [id] }) as const),
    abi: abi.idToMarketParams,
  })
}

function extractTokensAndLtv(res: any) {
  const [loanToken, collateralToken, , , lltv] = res.output
  return { loanToken, collateralToken, lltv }
}

function addToComptroller(comptroller: Contract, asset: AssetInfo, collateralDetails: any, debtDetails: any) {
  comptroller.assets.push(
    {
      ...collateralDetails,
      ltv: asset.ltv,
      id: asset.id,
      category: 'lend',
    },
    {
      ...debtDetails,
      id: asset.id,
      category: 'borrow',
    },
  )
}
