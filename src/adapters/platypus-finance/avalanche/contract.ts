import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'

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
}

const PTP: Token = {
  chain: 'avalanche',
  address: '0x22d4002028f537599be9f666d1c4fa138522f9c8',
  decimals: 18,
  symbol: 'PTP',
}

export async function getPlatypusContract(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const poolLengthRes = await call({ ctx, target: contract.address, params: [], abi: abi.poolLength })
  const poolLength = parseInt(poolLengthRes.output)

  const calls: Call[] = []
  for (let idx = 0; idx < poolLength; idx++) {
    calls.push({ target: contract.address, params: [idx] })
  }

  const poolsInfosRes = await multicall({ ctx, calls, abi: abi.poolInfo })

  const lpTokensCalls: (Call | null)[] = []
  const rewarderCalls: (Call | null)[] = []
  for (let poolIdx = 0; poolIdx < poolLength; poolIdx++) {
    const poolsInfoRes = poolsInfosRes[poolIdx]

    lpTokensCalls.push(isSuccess(poolsInfoRes) ? { target: poolsInfoRes.output.lpToken, params: [] } : null)
    rewarderCalls.push(isSuccess(poolsInfoRes) ? { target: poolsInfoRes.output.rewarder, params: [] } : null)
  }

  const [lpTokensInfosPoolsRes, lpTokensInfosUnderlyingsRes, rewarderTokensRes] = await Promise.all([
    multicall({ ctx, calls: lpTokensCalls, abi: abi.pool }),
    multicall<string, [], string>({ ctx, calls: lpTokensCalls, abi: abi.underlyingToken }),
    multicall({ ctx, calls: rewarderCalls, abi: abi.rewardTokens }),
  ])

  for (let poolIdx = 0; poolIdx < poolLength; poolIdx++) {
    const poolsInfoRes = poolsInfosRes[poolIdx]
    const lpTokensInfosPool = lpTokensInfosPoolsRes[poolIdx]
    const lpTokensInfosUnderlying = lpTokensInfosUnderlyingsRes[poolIdx]
    const rewarderToken = rewarderTokensRes[poolIdx]

    if (!isSuccess(poolsInfoRes) || !isSuccess(lpTokensInfosPool) || !isSuccess(lpTokensInfosUnderlying)) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      pid: poolIdx,
      address: poolsInfoRes.output.lpToken,
      rewarder: poolsInfoRes.output.rewarder,
      rewards: [PTP, ...(isSuccess(rewarderToken) ? rewarderToken.output : [])],
      pool: lpTokensInfosPool.output,
      underlyings: [lpTokensInfosUnderlying.output],
    })
  }

  return contracts
}
