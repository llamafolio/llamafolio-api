import type { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

import type { IPools } from '.'

const abi = {
  poolToken: {
    inputs: [],
    name: 'poolToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ILV: Token = {
  chain: 'ethereum',
  address: '0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E',
  decimals: 18,
  symbol: 'ILV',
}

export interface ILVContract extends Contract {
  token: `0x${string}`
}

export async function getILVContracts(ctx: BaseContext, pools: IPools[]): Promise<Contract[]> {
  const contracts: ILVContract[] = []

  const poolTokensRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address })),
    abi: abi.poolToken,
  })

  pools.forEach(async (pool, poolIdx) => {
    const poolTokenRes = poolTokensRes[poolIdx]

    if (!poolTokenRes.success) {
      return
    }

    const contract: ILVContract = {
      chain: ctx.chain,
      address: pool.address,
      token: poolTokenRes.output,
      staker: pool.staker,
      provider: pool.provider,
      rewards: [ILV],
    }

    switch (contract.provider) {
      case 'illuvium':
        contract.underlyings = [poolTokenRes.output]
        contracts.push(contract)
        break

      case 'sushi':
        contract.underlyings = [
          '0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E',
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        ]
        contracts.push(contract)
        break

      default:
        break
    }
  })

  return contracts
}
