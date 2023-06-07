import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { ADDRESS_ZERO } from '@lib/contract'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

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
} as const

export async function getGaugesContracts(ctx: BaseContext, pools: Contract[], gaugeFactory: Contract, CRV: Token) {
  const gaugesAddressesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: gaugeFactory.address, params: [pool.lpToken] } as const)),
    abi: abi.get_gauge_from_lp_token,
  })

  const gauges: Contract[] = mapSuccessFilter(gaugesAddressesRes, (res, idx) => {
    const pool = pools[idx]

    if (res.output === ADDRESS_ZERO) {
      return null
    }

    return { ...pool, address: res.output, gauge: res.output, rewards: [CRV] }
  }).filter(isNotNullish)

  const rewardsTokensRes = await multicall({
    ctx,
    calls: gauges.map((gauge) => ({ target: gauge.address, params: [0n] } as const)),
    abi: abi.reward_tokens,
  })

  const fmtGauges: Contract[] = mapSuccessFilter(rewardsTokensRes, (res, idx) => {
    const gauge = gauges[idx]

    if (res.output === ADDRESS_ZERO) {
      return gauge
    }

    gauge.rewards?.push(res.output as any)
    return gauge
  })

  return fmtGauges
}
