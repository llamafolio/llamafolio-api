import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  rewardTokenLength: {
    constant: true,
    inputs: [],
    name: 'rewardTokenLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokens: {
    constant: true,
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewardTokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const wMEMO: Contract = {
  name: 'Wrapped MEMO',
  displayName: 'Wrapped MEMO',
  chain: 'avalanche',
  address: '0x0da67235dd5787d67955420c84ca1cecd4e5bb3b',
  decimals: 18,
  symbol: 'wMEMO ',
}

export async function getRewardsMEMOFarmTokens(ctx: BaseContext, wMEMOFarm: Contract): Promise<Contract> {
  const rewardTokenLength = await call({
    ctx,
    target: wMEMOFarm.address,
    abi: abi.rewardTokenLength,
  })

  const rewardTokensRes = await multicall({
    ctx,
    calls: rangeBI(0n, rewardTokenLength).map((i) => ({ target: wMEMOFarm.address, params: [i] }) as const),
    abi: abi.rewardTokens,
  })

  const rewardTokens = mapSuccessFilter(rewardTokensRes, (res) => res.output)

  return {
    chain: ctx.chain,
    address: wMEMOFarm.address,
    underlyings: [wMEMO],
    rewards: rewardTokens,
  }
}
