import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, range } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  registeredToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'registeredToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenToPoolInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'tokenToPoolInfo',
    outputs: [
      { internalType: 'address', name: 'stakingToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'accMGPPerShare', type: 'uint256' },
      { internalType: 'address', name: 'rewarder', type: 'address' },
      { internalType: 'address', name: 'helper', type: 'address' },
      { internalType: 'bool', name: 'helperNeedsHarvest', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getRewardLength: {
    inputs: [],
    name: 'getRewardLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokenInfos: {
    inputs: [],
    name: 'rewardTokenInfos',
    outputs: [
      { internalType: 'address[]', name: 'bonusTokenAddresses', type: 'address[]' },
      { internalType: 'string[]', name: 'bonusTokenSymbols', type: 'string[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  depositToken: {
    inputs: [],
    name: 'depositToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  lpToken: {
    inputs: [],
    name: 'lpToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMagpieContracts(ctx: BaseContext, masterchef: Contract): Promise<Contract[]> {
  const poolLength = await call({ ctx, target: masterchef.address, abi: abi.poolLength })

  const registeredTokensRes = await multicall({
    ctx,
    calls: range(0, Number(poolLength)).map((_, idx) => ({ target: masterchef.address, params: [idx] })),
    abi: abi.registeredToken,
  })

  const tokenInfosRes = await multicall({
    ctx,
    calls: registeredTokensRes.map((token) =>
      isSuccess(token) ? { target: masterchef.address, params: [token.output] } : null,
    ),
    abi: abi.tokenToPoolInfo,
  })

  const contracts: Contract[] = mapSuccessFilter(tokenInfosRes, (res) => {
    const { stakingToken, rewarder, helper } = res.output

    return {
      chain: ctx.chain,
      address: stakingToken,
      rewarder,
      helper,
      rewards: masterchef.rewards,
    }
  })

  return getUnderlyingsAndRewardsTokens(ctx, contracts)
}

const getUnderlyingsAndRewardsTokens = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const contracts: Contract[] = []

  const [bonusRewardsTokensRes, depositTokensRes, lpTokensRes] = await Promise.all([
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.rewarder })), abi: abi.rewardTokenInfos }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.helper })), abi: abi.depositToken }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.helper })), abi: abi.lpToken }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const bonusRewardsTokenRes = bonusRewardsTokensRes[poolIdx]
    const depositTokenRes = depositTokensRes[poolIdx]
    const lpTokenRes = lpTokensRes[poolIdx]

    if (!isSuccess(bonusRewardsTokenRes) || !isSuccess(depositTokenRes) || !isSuccess(lpTokenRes)) {
      continue
    }

    // MGP can also appears as an extraRewards
    const noDuplicateRewards = bonusRewardsTokenRes.output.bonusTokenAddresses.filter(
      (res: string) => res.toLowerCase() !== (pool.rewards?.[0] as string).toLowerCase(),
    )

    contracts.push({
      ...pool,
      address: lpTokenRes.output,
      staker: pool.address,
      underlyings: depositTokenRes ? [depositTokenRes.output] : [pool.address],
      lpToken: lpTokenRes.output,
      rewards: [pool.rewards, noDuplicateRewards].flat(),
    })
  }

  return contracts
}
