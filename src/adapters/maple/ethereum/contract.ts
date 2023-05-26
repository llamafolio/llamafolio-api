import type { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  poolsCreated: {
    inputs: [],
    name: 'poolsCreated',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pools: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'pools',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  liquidityAsset: {
    inputs: [],
    name: 'liquidityAsset',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakeAsset: {
    inputs: [],
    name: 'stakeAsset',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getCurrentTokens: {
    constant: true,
    inputs: [],
    name: 'getCurrentTokens',
    outputs: [{ internalType: 'address[]', name: 'tokens', type: 'address[]' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  stakeLocker: {
    inputs: [],
    name: 'stakeLocker',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getFarmContracts(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const getPoolsNumber = await call({
    ctx,
    target: contract.address,
    abi: abi.poolsCreated,
  })

  const getPoolsAddresses = await multicall({
    ctx,
    calls: range(0, Number(getPoolsNumber)).map((_, idx) => ({
      target: contract.address,
      params: [idx],
    })),
    abi: abi.pools,
  })

  const [getLPTokens, rewardsTokens, stakerAddressesRes] = await Promise.all([
    multicall({
      ctx,
      calls: getPoolsAddresses.map((pool) => (isSuccess(pool) ? { target: pool.output } : null)),
      abi: abi.stakeAsset,
    }),
    multicall({
      ctx,
      calls: getPoolsAddresses.map((pool) => (isSuccess(pool) ? { target: pool.output } : null)),
      abi: abi.liquidityAsset,
    }),
    multicall({
      ctx,
      calls: getPoolsAddresses.map((pool) => (isSuccess(pool) ? { target: pool.output } : null)),
      abi: abi.stakeLocker,
    }),
  ])

  const getUnderlyingsTokensAddresses = await multicall({
    ctx,
    calls: getLPTokens.map((token) => (isSuccess(token) ? { target: token.output } : null)),
    abi: abi.getCurrentTokens,
  })

  for (let poolIdx = 0; poolIdx < getPoolsNumber; poolIdx++) {
    const getPoolsAddress = getPoolsAddresses[poolIdx]
    const getLPToken = getLPTokens[poolIdx]
    const rewardsToken = rewardsTokens[poolIdx]
    const stakerAddressRes = stakerAddressesRes[poolIdx]
    const getUnderlyingsTokensAddress = getUnderlyingsTokensAddresses[poolIdx]

    if (
      !isSuccess(getPoolsAddress) ||
      !isSuccess(getLPToken) ||
      !isSuccess(rewardsToken) ||
      !isSuccess(stakerAddressRes) ||
      !isSuccess(getUnderlyingsTokensAddress)
    ) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: getPoolsAddress.output,
      lpToken: getLPToken.output,
      staker: stakerAddressRes.output,
      underlyings: getUnderlyingsTokensAddress.output,
      rewards: [rewardsToken.output],
    })
  }

  return contracts
}
