import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getPalPools: {
    inputs: [],
    name: 'getPalPools',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  palToken: {
    inputs: [],
    name: 'palToken',
    outputs: [{ internalType: 'contract IPalToken', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlying: {
    inputs: [],
    name: 'underlying',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPaladinContracts(ctx: BaseContext, comptroller: Contract): Promise<Contract[]> {
  const poolsAddresses = await call({ ctx, target: comptroller.address, abi: abi.getPalPools })

  const [poolTokensRes, underlyingsTokensRes] = await Promise.all([
    multicall({ ctx, calls: poolsAddresses.map((address) => ({ target: address }) as const), abi: abi.palToken }),
    multicall({ ctx, calls: poolsAddresses.map((address) => ({ target: address }) as const), abi: abi.underlying }),
  ])

  return mapMultiSuccessFilter(
    poolTokensRes.map((_, i) => [poolTokensRes[i], underlyingsTokensRes[i]]),

    (res, index) => {
      const [{ output: token }, { output: underlyingOriginal }] = res.inputOutputPairs

      // Replacement of stAAVE by AAVE since their price is identical
      const underlying =
        underlyingOriginal === '0x4da27a545c0c5B758a6BA100e3a049001de870f5'
          ? '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9'
          : underlyingOriginal

      return {
        chain: ctx.chain,
        address: token,
        token,
        staker: poolsAddresses[index],
        underlyings: [underlying],
      }
    },
  )
}
