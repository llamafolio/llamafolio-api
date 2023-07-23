import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  getVault: {
    inputs: [
      {
        internalType: 'uint256',
        name: 'vaultId',
        type: 'uint256',
      },
    ],
    name: 'getVault',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'gauge',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'pair',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'token0',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'token1',
            type: 'address',
          },
          {
            internalType: 'bool',
            name: 'stable',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'paused',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'frozen',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'borrowingEnabled',
            type: 'bool',
          },
          {
            internalType: 'bool',
            name: 'liquidateWithTWAP',
            type: 'bool',
          },
          {
            internalType: 'uint16',
            name: 'maxLeverage',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'premiumMaxLeverage',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'maxPriceDiff',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'liquidateDebtRatio',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'withdrawFeeRate',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'compoundFeeRate',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'liquidateFeeRate',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'rangeStopFeeRate',
            type: 'uint16',
          },
          {
            internalType: 'uint16',
            name: 'protocolFeeRate',
            type: 'uint16',
          },
          {
            internalType: 'uint256',
            name: 'premiumRequirement',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'protocolFee0Accumulated',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'protocolFee1Accumulated',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'minInvestValue',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'minSwapAmount0',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'minSwapAmount1',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'totalLp',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'totalLpShares',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'premiumUtilizationOfReserve0',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'debtLimit0',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'debtPositionId0',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'debtTotalShares0',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'premiumUtilizationOfReserve1',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'debtLimit1',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'debtPositionId1',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'debtTotalShares1',
            type: 'uint256',
          },
        ],
        internalType: 'struct VaultTypes.VeloVaultState',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getExtraVaults(ctx: BaseContext, factory: Contract): Promise<Contract[]> {
  const LIMIT = 100n

  const vaultsRes = await multicall({
    ctx,
    calls: rangeBI(1n, LIMIT).map((idx) => ({ target: factory.address, params: [idx] } as const)),
    abi: abi.getVault,
  })

  return mapSuccessFilter(vaultsRes, (res, idx) => {
    const { gauge, pair, token0, token1 } = res.output

    return {
      chain: ctx.chain,
      address: pair,
      gauge,
      underlyings: [token0, token1],
      pid: idx + 1,
    }
  })
}
