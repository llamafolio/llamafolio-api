import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  poolsLength: {
    inputs: [],
    name: 'poolsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolAddressByIndex: {
    inputs: [{ internalType: 'uint256', name: 'index', type: 'uint256' }],
    name: 'getPoolAddressByIndex',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolInfo: {
    inputs: [],
    name: 'getPoolInfo',
    outputs: [
      { internalType: 'address', name: 'lpToken', type: 'address' },
      { internalType: 'address', name: 'protocolToken', type: 'address' },
      { internalType: 'address', name: 'xToken', type: 'address' },
      { internalType: 'uint256', name: 'lastRewardTime', type: 'uint256' },
      { internalType: 'uint256', name: 'accRewardsPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'accRewardsPerShareWETH', type: 'uint256' },
      { internalType: 'uint256', name: 'lpSupply', type: 'uint256' },
      { internalType: 'uint256', name: 'lpSupplyWithMultiplier', type: 'uint256' },
      { internalType: 'uint256', name: 'allocPoints', type: 'uint256' },
      { internalType: 'uint256', name: 'allocPointsWETH', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export const getMasterChefPoolsNFTContracts = async (ctx: BaseContext, masterchef: Contract): Promise<Contract[]> => {
  const poolLengthRes = await call({ ctx, target: masterchef.address, abi: abi.poolsLength })
  const poolAddresses = await multicall({
    ctx,
    calls: rangeBI(0n, poolLengthRes).map((idx) => ({ target: masterchef.address, params: [idx] }) as const),
    abi: abi.getPoolAddressByIndex,
  })

  let pools: Contract[] = mapSuccessFilter(poolAddresses, (res) => ({
    chain: ctx.chain,
    address: res.output,
    pid: res.input.params[0],
  }))

  const poolInfosRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address })),
    abi: abi.getPoolInfo,
  })

  pools = mapSuccessFilter(poolInfosRes, (res, idx) => {
    const [lpToken, BSX, xBSX] = res.output

    return {
      ...pools[idx],
      address: pools[idx].address,
      token: lpToken,
      lpToken,
      rewards: [BSX, xBSX],
    }
  })

  return getPairsDetails(ctx, pools, { getAddress: (pool) => pool.lpToken })
}
