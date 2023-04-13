import { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  poolInfo: {
    constant: true,
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'underlyingToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardTime', type: 'uint256' },
      { internalType: 'uint256', name: 'accBellaPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'totalEffectiveAmount', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  poolLength: {
    constant: true,
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  bella: {
    constant: true,
    inputs: [],
    name: 'bella',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    constant: true,
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getBellaContracts(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const [{ output: poolLength }, { output: bellaToken }] = await Promise.all([
    call({ ctx, target: contract.address, abi: abi.poolLength }),
    call({ ctx, target: contract.address, abi: abi.bella }),
  ])

  const poolInfosRes = await multicall({
    ctx,
    calls: range(0, poolLength).map((_, idx) => ({ target: contract.address, params: [idx] })),
    abi: abi.poolInfo,
  })

  const tokensRes = await multicall({
    ctx,
    calls: poolInfosRes.map((pool) => (isSuccess(pool) ? { target: pool.output.underlyingToken } : null)),
    abi: abi.token,
  })

  for (let poolIdx = 0; poolIdx < poolLength; poolIdx++) {
    const poolInfoRes = poolInfosRes[poolIdx]
    const tokenRes = tokensRes[poolIdx]

    if (!isSuccess(poolInfoRes) || !isSuccess(tokenRes)) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: poolInfoRes.output.underlyingToken,
      underlyings: [tokenRes.output],
      rewards: [bellaToken],
      pid: poolIdx,
    })
  }

  return contracts
}
