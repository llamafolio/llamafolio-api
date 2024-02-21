import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getHlpTokens: {
    inputs: [],
    name: 'getHlpTokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewarders: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewarders',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getAllRewarders: {
    inputs: [],
    name: 'getAllRewarders',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const hlpConfig: `0x${string}` = '0xF4F7123fFe42c4C90A4bCDD2317D397E0B7d7cc0'

export async function getHLPContract(ctx: BaseContext, HLP: Contract): Promise<Contract> {
  const underlyings = await call({ ctx, target: hlpConfig, abi: abi.getHlpTokens })
  return { ...HLP, underlyings: underlyings.flat() }
}

export async function getsHLPContract(ctx: BaseContext, sHLP: Contract): Promise<Contract> {
  const [underlyings, rewardersRes] = await Promise.all([
    call({ ctx, target: hlpConfig, abi: abi.getHlpTokens }),
    multicall({
      ctx,
      calls: rangeBI(0n, 4n).map((i) => ({ target: sHLP.address, params: [i] }) as const),
      abi: abi.rewarders,
    }),
  ])

  const rewardsRes = await multicall({
    ctx,
    calls: mapSuccessFilter(rewardersRes, (res) => ({ target: res.output }) as const),
    abi: abi.rewardToken,
  })

  return {
    ...sHLP,
    underlyings: underlyings.flat(),
    rewarders: mapSuccessFilter(rewardersRes, (res) => res.output),
    rewards: mapSuccessFilter(rewardsRes, (res) => res.output),
  }
}

export async function getHMXContract(ctx: BaseContext, controller: Contract): Promise<Contract> {
  const rewarders = await call({ ctx, target: controller.address, abi: abi.getAllRewarders })

  const rewardsRes = await multicall({
    ctx,
    calls: rewarders.map((rewarder) => ({ target: rewarder }) as const),
    abi: abi.rewardToken,
  })

  return {
    ...controller,
    rewarders,
    rewards: mapSuccessFilter(rewardsRes, (res) => res.output),
  }
}
