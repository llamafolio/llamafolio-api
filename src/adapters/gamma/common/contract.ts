import { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import fetch from 'node-fetch'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: 'pools', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingSushi: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingSushi',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  lpToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lpToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token0: {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token1: {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getPoolContractsFromAPI(ctx: BaseContext, API_URLs: string[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  for (const API_URL of API_URLs) {
    const response = await fetch(API_URL)
    const datas = await response.json()

    contracts.push(
      ...Object.entries(datas).map(([address, data]: any) => ({
        chain: ctx.chain,
        address,
        pool: data.poolAddress,
        underlyings: [data.token0, data.token1],
      })),
    )
  }

  return contracts
}

export async function getGammaMarketsContracts(ctx: BaseContext, masterchefs: Contract[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  for (const masterchef of masterchefs) {
    const { output: poolLength } = await call({ ctx, target: masterchef.address, abi: abi.poolLength })

    const lpTokensRes = await multicall({
      ctx,
      calls: range(0, poolLength).map((_, idx) => ({ target: masterchef.address, params: [idx] })),
      abi: abi.lpToken,
    })

    const [tokens0Res, tokens1Res] = await Promise.all([
      multicall({
        ctx,
        calls: lpTokensRes.map((lpToken) => (isSuccess(lpToken) ? { target: lpToken.output } : null)),
        abi: abi.token0,
      }),
      multicall({
        ctx,
        calls: lpTokensRes.map((lpToken) => (isSuccess(lpToken) ? { target: lpToken.output } : null)),
        abi: abi.token1,
      }),
    ])

    for (let poolIdx = 0; poolIdx < poolLength; poolIdx++) {
      const lpTokenRes = lpTokensRes[poolIdx]
      const token0Res = tokens0Res[poolIdx]
      const token1Res = tokens1Res[poolIdx]

      if (!isSuccess(lpTokenRes) || !isSuccess(token0Res) || !isSuccess(token1Res)) {
        continue
      }

      contracts.push({
        chain: ctx.chain,
        address: lpTokenRes.output,
        underlyings: [token0Res.output, token1Res.output],
        provider: masterchef.address,
        pid: poolIdx,
      })
    }
  }
  return contracts
}
