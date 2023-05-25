import type { BaseContext, Contract } from '@lib/adapter'
import { ADDRESS_ZERO } from '@lib/contract'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'

const abi = {
  get_gauge_from_lp_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_gauge_from_lp_token',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  reward_tokens: {
    stateMutability: 'view',
    type: 'function',
    name: 'reward_tokens',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3787,
  },
}

export async function getGaugesContracts(ctx: BaseContext, pools: Contract[], gaugeFactory: Contract, CRV: Token) {
  const gauges: Contract[] = []

  const calls: Call[] = []
  for (const pool of pools) {
    calls.push({ target: gaugeFactory.address, params: [pool.lpToken] })
  }

  const gaugesAddressesRes = await multicall({ ctx, calls, abi: abi.get_gauge_from_lp_token })

  for (let idx = 0; idx < pools.length; idx++) {
    const pool = pools[idx]
    const gauge = gaugesAddressesRes[idx]

    if (!isSuccess(gauge) || gauge.output === ADDRESS_ZERO) {
      continue
    }
    gauges.push({ ...pool, address: gauge.output, gauge: gauge.output, rewards: [CRV] })
  }

  const gaugeRewardsCalls: Call[] = []
  for (const gauge of gauges) {
    gaugeRewardsCalls.push({ target: gauge.address, params: [0] })
  }

  const rewardsTokensRes = await multicall({ ctx, calls: gaugeRewardsCalls, abi: abi.reward_tokens })

  for (let gaugeIdx = 0; gaugeIdx < gauges.length; gaugeIdx++) {
    const gauge = gauges[gaugeIdx]
    const rewardTokenRes = rewardsTokensRes[gaugeIdx]

    if (!isSuccess(rewardTokenRes) || rewardTokenRes.output === ADDRESS_ZERO) {
      continue
    }
    gauge!.rewards?.push(rewardTokenRes.output)
  }

  return gauges
}
