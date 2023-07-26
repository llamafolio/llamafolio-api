import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'accCorePerShare', type: 'uint256' },
      { internalType: 'bool', name: 'withdrawable', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  consumedToken: {
    inputs: [],
    name: 'consumedToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getCVaultContracts(ctx: BaseContext, masterchef: Contract): Promise<Contract[]> {
  const length = await call({ ctx, target: masterchef.address, abi: abi.poolLength })

  const poolInfos = await multicall({
    ctx,
    calls: rangeBI(0n, length).map((index) => ({ target: masterchef.address, params: [index] }) as const),
    abi: abi.poolInfo,
  })

  const pools: Contract[] = mapSuccessFilter(poolInfos, (res, index) => {
    const [address, _allocPoint, _accCorePerShare, _withdrawable] = res.output

    return {
      chain: ctx.chain,
      address,
      pid: index,
    }
  })

  const lpTokensRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address }) as const),
    abi: abi.consumedToken,
  })

  const fmtPools: Contract[] = pools.map((pool, index) => {
    const lpToken = lpTokensRes[index].success ? lpTokensRes[index].output : pool.address

    return {
      ...pool,
      address: lpToken!,
      lpToken,
      pool: pool.address,
    }
  })

  const fmtPoolsWithUnderlyings = await getPairsDetails(ctx, fmtPools)

  for (let i = 0; i < fmtPoolsWithUnderlyings.length; i++) {
    const contractIndex = fmtPools.findIndex((c) => c.address === fmtPoolsWithUnderlyings[i].address)
    if (contractIndex !== -1) {
      fmtPools[contractIndex] = Object.assign({}, fmtPools[contractIndex], fmtPoolsWithUnderlyings[i])
    }
  }

  return fmtPools
}
