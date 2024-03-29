import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IAsset', name: 'lpToken', type: 'address' },
      { internalType: 'contract IBoostedMultiRewarder', name: 'rewarder', type: 'address' },
      { internalType: 'uint128', name: 'sumOfFactors', type: 'uint128' },
      { internalType: 'uint128', name: 'accPtpPerShare', type: 'uint128' },
      { internalType: 'uint128', name: 'accPtpPerFactorShare', type: 'uint128' },
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
  rewarderBonusTokenInfo: {
    inputs: [{ internalType: 'uint256', name: '_pid', type: 'uint256' }],
    name: 'rewarderBonusTokenInfo',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'bonusTokenAddresses', type: 'address[]' },
      { internalType: 'string[]', name: 'bonusTokenSymbols', type: 'string[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pool: {
    inputs: [],
    name: 'pool',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlyingToken: {
    inputs: [],
    name: 'underlyingToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokens: {
    inputs: [],
    name: 'rewardTokens',
    outputs: [{ internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const PTP: Token = {
  chain: 'avalanche',
  address: '0x22d4002028f537599be9f666d1c4fa138522f9c8',
  decimals: 18,
  symbol: 'PTP',
}

export async function getPlatypusContract(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const poolLengthRes = await call({ ctx, target: contract.address, abi: abi.poolLength })
  const poolLength = Number(poolLengthRes)

  const calls: Call<typeof abi.poolInfo>[] = []
  for (let idx = 0; idx < poolLength; idx++) {
    calls.push({ target: contract.address, params: [BigInt(idx)] })
  }

  const poolsInfosRes = await multicall({ ctx, calls, abi: abi.poolInfo })

  const lpTokensCalls: (Call<typeof abi.pool> | null)[] = []
  const rewarderCalls: (Call<typeof abi.rewardTokens> | null)[] = []
  for (let poolIdx = 0; poolIdx < poolLength; poolIdx++) {
    const poolsInfoRes = poolsInfosRes[poolIdx]
    if (poolsInfoRes.success) {
      const [lpToken, rewarder] = poolsInfoRes.output
      lpTokensCalls.push({ target: lpToken })
      rewarderCalls.push({ target: rewarder })
    } else {
      lpTokensCalls.push(null)
      rewarderCalls.push(null)
    }
  }

  const [lpTokensInfosPoolsRes, lpTokensInfosUnderlyingsRes, rewarderTokensRes] = await Promise.all([
    multicall({ ctx, calls: lpTokensCalls, abi: abi.pool }),
    multicall({ ctx, calls: lpTokensCalls, abi: abi.underlyingToken }),
    multicall({ ctx, calls: rewarderCalls, abi: abi.rewardTokens }),
  ])

  for (let poolIdx = 0; poolIdx < poolLength; poolIdx++) {
    const poolsInfoRes = poolsInfosRes[poolIdx]
    const lpTokensInfosPool = lpTokensInfosPoolsRes[poolIdx]
    const lpTokensInfosUnderlying = lpTokensInfosUnderlyingsRes[poolIdx]
    const rewarderToken = rewarderTokensRes[poolIdx]

    if (!poolsInfoRes.success || !lpTokensInfosPool.success || !lpTokensInfosUnderlying.success) {
      continue
    }

    const [lpToken, rewarder] = poolsInfoRes.output

    contracts.push({
      chain: ctx.chain,
      pid: poolIdx,
      address: lpToken,
      rewarder: rewarder,
      rewards: [PTP, ...(rewarderToken.success ? rewarderToken.output : [])],
      pool: lpTokensInfosPool.output,
      underlyings: [lpTokensInfosUnderlying.output],
    })
  }

  return contracts
}
