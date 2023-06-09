import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { keyBy, mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'
import type { Pair } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  poolInfo: {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'poolInfo',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: 'lpToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'mcv2PoolId',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'totalAmount',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'userInfo',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'lastActionTime',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPancakeFarmBalances(
  ctx: BalancesContext,
  pairs: Pair[],
  masterchef: Contract,
): Promise<Balance[]> {
  const poolLength = await call({ ctx, target: masterchef.address, abi: abi.poolLength })

  const calls: Call<typeof abi.poolInfo>[] = []
  for (let idx = 0; idx < poolLength; idx++) {
    calls.push({ target: masterchef.address, params: [BigInt(idx)] })
  }

  const poolInfosRes = await multicall({ ctx, calls, abi: abi.poolInfo })

  const pools: Contract[] = mapSuccessFilter(poolInfosRes, (res) => ({
    chain: ctx.chain,
    address: res.output[0],
    lpToken: res.output[0],
    pid: res.input.params![0],
    masterchef: res.input.target,
  }))

  const pairByAddress = keyBy(pairs, 'address', { lowercase: true })

  const masterchefPools = pools
    .map((pool) => {
      const pair = pairByAddress[pool.lpToken.toLowerCase()]

      if (!pair) {
        return null
      }

      const contract: Contract = { ...pair, pid: pool.pid, masterchef: pool.masterchef, category: 'farm' }
      return contract
    })
    .filter(isNotNullish)

  const userBalancesRes = await multicall({
    ctx,
    calls: masterchefPools.map((pool) => ({ target: pool.masterchef, params: [pool.pid, ctx.address] } as const)),
    abi: abi.userInfo,
  })

  const userBalances: Balance[] = mapSuccessFilter(userBalancesRes, (res, idx) => {
    const masterchefPool = masterchefPools[idx]
    const [amount, _lastActionTime] = res.output

    return {
      ...masterchefPool,
      amount,
      underlyings: masterchefPool.underlyings as Contract[],
      rewards: undefined,
      category: 'farm',
    }
  })

  return getUnderlyingBalances(ctx, userBalances)
}
